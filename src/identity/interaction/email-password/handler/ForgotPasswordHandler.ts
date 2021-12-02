import assert from 'assert';
import { BasicRepresentation } from '../../../../http/representation/BasicRepresentation';
import type { Representation } from '../../../../http/representation/Representation';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { APPLICATION_JSON } from '../../../../util/ContentTypes';
import { readJsonStream } from '../../../../util/StreamUtil';
import type { TemplateEngine } from '../../../../util/templates/TemplateEngine';
import { BaseInteractionHandler } from '../../BaseInteractionHandler';
import type { InteractionHandlerInput } from '../../InteractionHandler';
import type { InteractionRoute } from '../../routing/InteractionRoute';
import type { EmailSender } from '../../util/EmailSender';
import type { AccountStore } from '../storage/AccountStore';

const forgotPasswordView = {
  required: {
    email: 'string',
  },
} as const;

export interface ForgotPasswordHandlerArgs {
  accountStore: AccountStore;
  templateEngine: TemplateEngine<{ resetLink: string }>;
  emailSender: EmailSender;
  resetRoute: InteractionRoute;
}

/**
 * Handles the submission of the ForgotPassword form
 */
export class ForgotPasswordHandler extends BaseInteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly templateEngine: TemplateEngine<{ resetLink: string }>;
  private readonly emailSender: EmailSender;
  private readonly resetRoute: InteractionRoute;

  public constructor(args: ForgotPasswordHandlerArgs) {
    super(forgotPasswordView);
    this.accountStore = args.accountStore;
    this.templateEngine = args.templateEngine;
    this.emailSender = args.emailSender;
    this.resetRoute = args.resetRoute;
  }

  public async handlePost({ operation }: InteractionHandlerInput): Promise<Representation> {
    // Validate incoming data
    const { email } = await readJsonStream(operation.body.data);
    assert(typeof email === 'string' && email.length > 0, 'Email required');

    await this.resetPassword(email);
    return new BasicRepresentation(JSON.stringify({ email }), operation.target, APPLICATION_JSON);
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
    const resetLink = `${this.resetRoute.getPath()}?rid=${encodeURIComponent(recordId)}`;
    const renderedEmail = await this.templateEngine.render({ resetLink });
    await this.emailSender.handleSafe({
      recipient: email,
      subject: 'Reset your password',
      text: `To reset your password, go to this link: ${resetLink}`,
      html: renderedEmail,
    });
  }
}
