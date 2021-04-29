import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpResponse } from '../../../../server/HttpResponse';
import type { InteractionHttpHandlerInput } from '../../InteractionHttpHandler';
import { InteractionHttpHandler } from '../../InteractionHttpHandler';
import type { EmailSender } from '../../util/EmailSender';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import type { IdpRenderHandler } from '../../util/IdpRenderHandler';
import type { TemplateRenderer } from '../../util/TemplateRenderer';
import { throwIdpInteractionError } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';

export interface ForgotPasswordHandlerArgs {
  messageRenderHandler: IdpRenderHandler;
  accountStore: AccountStore;
  baseUrl: string;
  idpPathName: string;
  emailTemplateRenderer: TemplateRenderer<{ resetLink: string }>;
  emailSender: EmailSender;
}

/**
 * Handles the submission of the ForgotPassword form
 */
export class ForgotPasswordHandler extends InteractionHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly messageRenderHandler: IdpRenderHandler;
  private readonly accountStore: AccountStore;
  private readonly baseUrl: string;
  private readonly idpPathName: string;
  private readonly emailTemplateRenderer: TemplateRenderer<{ resetLink: string }>;
  private readonly emailSender: EmailSender;

  public constructor(args: ForgotPasswordHandlerArgs) {
    super();
    this.messageRenderHandler = args.messageRenderHandler;
    this.accountStore = args.accountStore;
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

  public async handle(input: InteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(input.request, input.response);
    try {
      // Validate incoming data
      const { email } = await getFormDataRequestBody(input.request);

      // Qualify email
      assert(email && typeof email === 'string', 'Email required');

      // Create forgot password confirmation record
      let recordId: string;
      try {
        recordId = await this.accountStore.generateForgotPasswordRecord(email);
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
      await this.emailSender.handleSafe({
        recipient: email,
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
