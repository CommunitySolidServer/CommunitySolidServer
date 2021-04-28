import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { HttpHandler } from '../../../../server/HttpHandler';
import type { RenderHandler } from '../../../../server/util/RenderHandler';
import { isNativeError } from '../../../../util/errors/ErrorUtil';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import { assertPassword } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';
import type { ResetPasswordRenderHandler } from './ResetPasswordRenderHandler';

export interface ResetPasswordHandlerArgs {
  accountStore: AccountStore;
  renderHandler: ResetPasswordRenderHandler;
  messageRenderHandler: RenderHandler<{ message: string }>;
}

/**
 * Handles the submission of the ResetPassword form, the form
 * that is linked in the reset password email.
 */
export class ResetPasswordHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly renderHandler: ResetPasswordRenderHandler;
  private readonly messageRenderHandler: RenderHandler<{ message: string }>;

  public constructor(args: ResetPasswordHandlerArgs) {
    super();
    this.accountStore = args.accountStore;
    this.renderHandler = args.renderHandler;
    this.messageRenderHandler = args.messageRenderHandler;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    let prefilledRecordId = '';
    try {
      // Parse params
      const {
        password,
        confirmPassword,
        recordId,
      } = await getFormDataRequestBody(input.request);
      assert(
        recordId && typeof recordId === 'string',
        'Invalid request. Open the link from your email again',
      );
      prefilledRecordId = recordId;
      assertPassword(password, confirmPassword);

      // Reset password
      const email = await this.accountStore.getForgotPasswordRecord(recordId);
      assert(email, 'This reset password link is no longer valid.');
      await this.accountStore.deleteForgotPasswordRecord(recordId);

      await this.accountStore.changePassword(email, password);

      await this.messageRenderHandler.handleSafe({
        response: input.response,
        props: {
          message: 'Your password was successfully reset.',
        },
      });

      this.logger.debug(`Resetting password for user ${email}`);
    } catch (err: unknown) {
      const errorMessage: string = isNativeError(err) ? err.message : 'An unknown error occurred';
      await this.renderHandler.handleSafe({
        response: input.response,
        props: {
          errorMessage,
          recordId: prefilledRecordId,
        },
      });
    }
  }
}
