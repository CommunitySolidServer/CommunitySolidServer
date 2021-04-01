import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpResponse } from '../../../../server/HttpResponse';
import type { IdpInteractionHttpHandlerInput } from '../../IdpInteractionHttpHandler';
import { IdpInteractionHttpHandler } from '../../IdpInteractionHttpHandler';
import type { EmailSender } from '../../util/EmailSender';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import type { IdpRenderHandler } from '../../util/IdpRenderHandler';
import type { TemplateRenderer } from '../../util/TemplateRenderer';
import { throwIdpInteractionError } from '../EmailPasswordUtil';
import type { EmailPasswordStore } from '../storage/EmailPasswordStore';

export interface EmailPasswordForgotPasswordHandlerArgs {
  messageRenderHandler: IdpRenderHandler;
  emailPasswordStorageAdapter: EmailPasswordStore;
  baseUrl: string;
  idpPathName: string;
  emailTemplateRenderer: TemplateRenderer<{ resetLink: string }>;
  emailSender: EmailSender;
}

/**
 * Handles the submission of the ForgotPassword form
 */
export class EmailPasswordForgotPasswordHandler extends IdpInteractionHttpHandler {
  private readonly messageRenderHandler: IdpRenderHandler;
  private readonly emailPasswordStorageAdapter: EmailPasswordStore;
  private readonly baseUrl: string;
  private readonly idpPathName: string;
  private readonly logger = getLoggerFor(this);
  private readonly emailTemplateRenderer: TemplateRenderer<{ resetLink: string }>;
  private readonly emailSender: EmailSender;

  public constructor(args: EmailPasswordForgotPasswordHandlerArgs) {
    super();
    this.messageRenderHandler = args.messageRenderHandler;
    this.emailPasswordStorageAdapter = args.emailPasswordStorageAdapter;
    this.baseUrl = args.baseUrl;
    this.idpPathName = args.idpPathName;
    this.emailTemplateRenderer = args.emailTemplateRenderer;
    this.emailSender = args.emailSender;
  }

  /**
   * Sends a response through the messageRenderHandler.
   * @param response - HttpResponse to send to.
   * @param details - Details of the interaction.
   * @param email - Will be inserted in `prefilled` for the template.
   */
  private async sendResponse(response: HttpResponse, details: { uid: string }, email: string): Promise<void> {
    // Send response
    await this.messageRenderHandler.handleSafe({
      response,
      props: {
        details,
        errorMessage: '',
        prefilled: {
          email,
        },
      },
    });
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(input.request, input.response);
    try {
      // Validate incoming data
      const { email } = await getFormDataRequestBody(input.request);

      // Qualify email
      assert(email && typeof email === 'string', 'Email required');

      // Create forgot password confirmation record
      let recordId: string;
      try {
        recordId = await this.emailPasswordStorageAdapter.generateForgotPasswordRecord(email);
      } catch {
        // Don't emit an error for privacy reasons
        this.logger.warn(`Password reset request for unknown email ${email}`);
        await this.sendResponse(input.response, interactionDetails, email);
        return;
      }
      const resetLink = new URL(`${this.idpPathName}/resetpassword?rid=${recordId}`, this.baseUrl).href;

      // Send email
      this.logger.info(`Sending password reset to ${email}`);
      const renderedEmail = await this.emailTemplateRenderer.handleSafe({ resetLink });
      await this.emailSender.sendEmail(email, {
        subject: 'Reset your password',
        text: `To reset your password, go to this link: ${resetLink}`,
        html: renderedEmail,
      });

      await this.sendResponse(input.response, interactionDetails, email);
    } catch (err: unknown) {
      throwIdpInteractionError(err, {});
    }
  }
}
