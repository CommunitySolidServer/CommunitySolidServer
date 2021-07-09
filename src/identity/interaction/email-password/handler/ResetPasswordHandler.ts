import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { HttpHandler } from '../../../../server/HttpHandler';
import type { TemplateHandler } from '../../../../server/util/TemplateHandler';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import { assertPassword, throwIdpInteractionError } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';

export interface ResetPasswordHandlerArgs {
  accountStore: AccountStore;
  messageRenderHandler: TemplateHandler<{ message: string }>;
}

/**
 * Handles the submission of the ResetPassword form:
 * this is the form that is linked in the reset password email.
 */
export class ResetPasswordHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly messageRenderHandler: TemplateHandler<{ message: string }>;

  public constructor(args: ResetPasswordHandlerArgs) {
    super();
    this.accountStore = args.accountStore;
    this.messageRenderHandler = args.messageRenderHandler;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    try {
      // Extract record ID from request URL
      const recordId = /\/([^/]+)$/u.exec(input.request.url!)?.[1];
      // Validate input data
      const { password, confirmPassword } = await getFormDataRequestBody(input.request);
      assert(
        typeof recordId === 'string' && recordId.length > 0,
        'Invalid request. Open the link from your email again',
      );
      assertPassword(password, confirmPassword);

      await this.resetPassword(recordId, password);
      await this.messageRenderHandler.handleSafe({
        response: input.response,
        contents: {
          message: 'Your password was successfully reset.',
        },
      });
    } catch (error: unknown) {
      throwIdpInteractionError(error);
    }
  }

  /**
   * Resets the password for the account associated with the given recordId.
   */
  private async resetPassword(recordId: string, newPassword: string): Promise<void> {
    const email = await this.accountStore.getForgotPasswordRecord(recordId);
    assert(email, 'This reset password link is no longer valid.');
    await this.accountStore.deleteForgotPasswordRecord(recordId);
    await this.accountStore.changePassword(email, newPassword);
    this.logger.debug(`Resetting password for user ${email}`);
  }
}
