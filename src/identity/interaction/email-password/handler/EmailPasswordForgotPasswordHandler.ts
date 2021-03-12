import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { trimTrailingSlashes } from '../../../../util/PathUtil';
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
  private readonly logger = getLoggerFor(this);
  private readonly emailTamplateRenderer: TemplateRenderer<{ resetLink: string }>;
  private readonly emailSender: EmailSender;

  public constructor(args: EmailPasswordForgotPasswordHandlerArgs) {
    super();
    this.messageRenderHandler = args.messageRenderHandler;
    this.emailPasswordStorageAdapter = args.emailPasswordStorageAdapter;
    this.baseUrl = args.baseUrl;
    this.emailTamplateRenderer = args.emailTemplateRenderer;
    this.emailSender = args.emailSender;
  }

  private async sendResponse(
    input: HttpHandlerInput,
    interactionDetails: { uid: string },
    email: string,
  ): Promise<void> {
    // Send response
    await this.messageRenderHandler.handle({
      response: input.response,
      props: {
        details: interactionDetails,
        errorMessage: '',
        prefilled: {
          email,
        },
      },
    });
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(
      input.request,
      input.response,
    );
    try {
      // Validate incoming data
      const { email } = await getFormDataRequestBody(input.request);

      // Qualify email
      assert(email && typeof email === 'string', 'Email required');

      // Create forgot password confirmation record
      let recordId: string;
      try {
        recordId = await this.emailPasswordStorageAdapter.generateForgotPasswordRecord(
          email,
        );
      } catch {
        await this.sendResponse(input, interactionDetails, email);
        return;
      }
      const resetLink = `${trimTrailingSlashes(
        this.baseUrl,
      )}/resetpassword?rid=${recordId}`;

      // Send email
      const renderedEmail = await this.emailTamplateRenderer.render({
        resetLink,
      });
      await this.emailSender.sendEmail(email, {
        subject: 'Reset your password',
        text: `To reset your password, go to this link: ${resetLink}`,
        html: renderedEmail,
      });

      await this.sendResponse(input, interactionDetails, email);
    } catch (err: unknown) {
      throwIdpInteractionError(err, {});
    }
  }
}
