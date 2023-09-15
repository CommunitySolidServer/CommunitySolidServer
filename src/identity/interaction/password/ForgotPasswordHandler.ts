import { object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import type { TemplateEngine } from '../../../util/templates/TemplateEngine';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import type { InteractionRoute } from '../routing/InteractionRoute';
import { parseSchema, validateWithError } from '../YupUtil';
import type { EmailSender } from './util/EmailSender';
import type { ForgotPasswordStore } from './util/ForgotPasswordStore';
import type { PasswordStore } from './util/PasswordStore';

const inSchema = object({
  email: string().trim().email().required(),
});

export interface ForgotPasswordHandlerArgs {
  /**
   * Store containing the password login information.
   */
  passwordStore: PasswordStore;
  /**
   * Store containing the forgot password records.
   */
  forgotPasswordStore: ForgotPasswordStore;
  /**
   * Template engine that will be used to generate the email body.
   */
  templateEngine: TemplateEngine<{ resetLink: string }>;
  /**
   * Sender to send the actual email.
   */
  emailSender: EmailSender;
  /**
   * Route used to generate the reset link for the user.
   */
  resetRoute: InteractionRoute;
}

type OutType = { email: string };

/**
 * Responsible for the case where a user forgot their password and asks for a reset.
 * Will send out the necessary mail if the email address is known.
 * The JSON response will always be the same to prevent leaking which email addresses are stored.
 */
export class ForgotPasswordHandler extends JsonInteractionHandler<OutType> implements JsonView {
  protected readonly logger = getLoggerFor(this);

  private readonly passwordStore: PasswordStore;
  private readonly forgotPasswordStore: ForgotPasswordStore;
  private readonly templateEngine: TemplateEngine<{ resetLink: string }>;
  private readonly emailSender: EmailSender;
  private readonly resetRoute: InteractionRoute;

  public constructor(args: ForgotPasswordHandlerArgs) {
    super();
    this.passwordStore = args.passwordStore;
    this.forgotPasswordStore = args.forgotPasswordStore;
    this.templateEngine = args.templateEngine;
    this.emailSender = args.emailSender;
    this.resetRoute = args.resetRoute;
  }

  public async getView(): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

  /**
   * Generates a record to reset the password for the given email address and then mails it.
   * In case there is no account, no error wil be thrown for privacy reasons.
   * Nothing will happen instead.
   */
  public async handle({ json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    const { email } = await validateWithError(inSchema, json);

    const payload = await this.passwordStore.findByEmail(email);

    if (payload?.id) {
      try {
        const recordId = await this.forgotPasswordStore.generate(payload.id);
        await this.sendResetMail(recordId, email);
      } catch (error: unknown) {
        // This error can not be thrown for privacy reasons.
        // If there always is an error, because there is a problem with the mail server for example,
        // errors would only be thrown for registered accounts.
        // Although we do also leak this information when an account tries to register an email address,
        // so this might be removed in the future.
        this.logger.error(`Problem sending a recovery mail: ${createErrorMessage(error)}`);
      }
    } else {
      // Don't emit an error for privacy reasons
      this.logger.warn(`Password reset request for unknown email ${email}`);
    }

    return { json: { email }};
  }

  /**
   * Generates the link necessary for resetting the password and mails it to the given email address.
   */
  private async sendResetMail(recordId: string, email: string): Promise<void> {
    this.logger.info(`Sending password reset to ${email}`);
    const resetLink = `${this.resetRoute.getPath()}?rid=${encodeURIComponent(recordId)}`;
    const renderedEmail = await this.templateEngine.handleSafe({ contents: { resetLink }});
    await this.emailSender.handleSafe({
      recipient: email,
      subject: 'Reset your password',
      text: `To reset your password, go to this link: ${resetLink}`,
      html: renderedEmail,
    });
  }
}
