import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { readJsonStream } from '../../../../util/StreamUtil';
import type { InteractionResponseResult, InteractionHandlerInput } from '../../InteractionHandler';
import { InteractionHandler } from '../../InteractionHandler';
import { assertPassword } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';

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

  public async handle({ operation }: InteractionHandlerInput): Promise<InteractionResponseResult> {
    // Validate input data
    const { password, confirmPassword, recordId } = await readJsonStream(operation.body.data);
    assert(
      typeof recordId === 'string' && recordId.length > 0,
      'Invalid request. Open the link from your email again',
    );
    assertPassword(password, confirmPassword);

    await this.resetPassword(recordId, password);
    return { type: 'response' };
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
