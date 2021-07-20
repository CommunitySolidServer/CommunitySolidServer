import assert from 'assert';
import urljoin from 'url-join';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpResponse } from '../../../../server/HttpResponse';
import { ensureTrailingSlash } from '../../../../util/PathUtil';
import type { TemplateEngine } from '../../../../util/templates/TemplateEngine';
import type { InteractionHttpHandlerInput } from '../../InteractionHttpHandler';
import { InteractionHttpHandler } from '../../InteractionHttpHandler';
import type { EmailSender } from '../../util/EmailSender';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import type { IdpRenderHandler } from '../../util/IdpRenderHandler';
import { throwIdpInteractionError } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';

export interface ForgotPasswordHandlerArgs {
  messageRenderHandler: IdpRenderHandler;
  accountStore: AccountStore;
  baseUrl: string;
  idpPath: string;
  templateEngine: TemplateEngine<{ resetLink: string }>;
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
  private readonly idpPath: string;
  private readonly templateEngine: TemplateEngine<{ resetLink: string }>;
  private readonly emailSender: EmailSender;

  public constructor(args: ForgotPasswordHandlerArgs) {
    super();
    this.messageRenderHandler = args.messageRenderHandler;
    this.accountStore = args.accountStore;
    this.baseUrl = ensureTrailingSlash(args.baseUrl);
    this.idpPath = args.idpPath;
    this.templateEngine = args.templateEngine;
    this.emailSender = args.emailSender;
  }

  public async handle(input: InteractionHttpHandlerInput): Promise<void> {
    try {
      // Validate incoming data
      const { email } = await getFormDataRequestBody(input.request);
      assert(typeof email === 'string' && email.length > 0, 'Email required');

      await this.resetPassword(email);
      await this.sendResponse(input.response, email);
    } catch (err: unknown) {
      throwIdpInteractionError(err, {});
    }
  }

  /**
   * Generates a record to reset the password for the given email address and then mails it.
   * In case there is no account, no error wil be thrown for privacy reasons.
   * Instead nothing will happen instead.
   */
  private async resetPassword(email: string): Promise<void> {
    let recordId: string;
    try {
      recordId = await this.accountStore.generateForgotPasswordRecord(email);
    } catch {
      // Don't emit an error for privacy reasons
      this.logger.warn(`Password reset request for unknown email ${email}`);
      return;
    }
    await this.sendResetMail(recordId, email);
  }

  /**
   * Generates the link necessary for resetting the password and mails it to the given email address.
   */
  private async sendResetMail(recordId: string, email: string): Promise<void> {
    this.logger.info(`Sending password reset to ${email}`);
    const resetLink = urljoin(this.baseUrl, this.idpPath, `resetpassword?rid=${recordId}`);
    const renderedEmail = await this.templateEngine.render({ resetLink });
    await this.emailSender.handleSafe({
      recipient: email,
      subject: 'Reset your password',
      text: `To reset your password, go to this link: ${resetLink}`,
      html: renderedEmail,
    });
  }

  /**
   * Sends a response through the messageRenderHandler.
   * @param response - HttpResponse to send to.
   * @param email - Will be inserted in `prefilled` for the template.
   */
  private async sendResponse(response: HttpResponse, email: string): Promise<void> {
    // Send response
    await this.messageRenderHandler.handleSafe({
      response,
      contents: {
        errorMessage: '',
        prefilled: {
          email,
        },
      },
    });
  }
}
