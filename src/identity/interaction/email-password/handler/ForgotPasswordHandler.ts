import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { ensureTrailingSlash, joinUrl } from '../../../../util/PathUtil';
import { readJsonStream } from '../../../../util/StreamUtil';
import type { TemplateEngine } from '../../../../util/templates/TemplateEngine';
import { InteractionHandler } from '../../InteractionHandler';
import type { InteractionResponseResult, InteractionHandlerInput } from '../../InteractionHandler';
import type { EmailSender } from '../../util/EmailSender';
import type { AccountStore } from '../storage/AccountStore';

export interface ForgotPasswordHandlerArgs {
  accountStore: AccountStore;
  baseUrl: string;
  idpPath: string;
  templateEngine: TemplateEngine<{ resetLink: string }>;
  emailSender: EmailSender;
}

/**
 * Handles the submission of the ForgotPassword form
 */
export class ForgotPasswordHandler extends InteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly baseUrl: string;
  private readonly idpPath: string;
  private readonly templateEngine: TemplateEngine<{ resetLink: string }>;
  private readonly emailSender: EmailSender;

  public constructor(args: ForgotPasswordHandlerArgs) {
    super();
    this.accountStore = args.accountStore;
    this.baseUrl = ensureTrailingSlash(args.baseUrl);
    this.idpPath = args.idpPath;
    this.templateEngine = args.templateEngine;
    this.emailSender = args.emailSender;
  }

  public async handle({ operation }: InteractionHandlerInput): Promise<InteractionResponseResult<{ email: string }>> {
    // Validate incoming data
    const { email } = await readJsonStream(operation.body.data);
    assert(typeof email === 'string' && email.length > 0, 'Email required');

    await this.resetPassword(email);
    return { type: 'response', details: { email }};
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
    // `joinUrl` strips trailing slash when query parameter gets added
    const resetLink = `${joinUrl(this.baseUrl, this.idpPath, 'resetpassword/')}?rid=${recordId}`;
    const renderedEmail = await this.templateEngine.render({ resetLink });
    await this.emailSender.handleSafe({
      recipient: email,
      subject: 'Reset your password',
      text: `To reset your password, go to this link: ${resetLink}`,
      html: renderedEmail,
    });
  }
}
