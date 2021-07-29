import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import { assertPassword, throwIdpInteractionError } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';
import type { InteractionResponseResult } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';

/**
 * Handles the submission of the ResetPassword form:
 * this is the form that is linked in the reset password email.
 */
export class ResetPasswordHandler extends InteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;

  public constructor(accountStore: AccountStore) {
    super();
    this.accountStore = accountStore;
  }

  public async handle(input: HttpHandlerInput): Promise<InteractionResponseResult> {
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
      return { type: 'response', details: { message: 'Your password was successfully reset.' }};
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
