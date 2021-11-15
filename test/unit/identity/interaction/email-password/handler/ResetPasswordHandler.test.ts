import type { Operation } from '../../../../../../src/http/Operation';
import {
  ResetPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/ResetPasswordHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import { createPostJsonOperation } from './Util';

describe('A ResetPasswordHandler', (): void => {
  let operation: Operation;
  const recordId = '123456';
  const url = `/resetURL/${recordId}`;
  const email = 'alice@test.email';
  let accountStore: AccountStore;
  let handler: ResetPasswordHandler;

  beforeEach(async(): Promise<void> => {
    accountStore = {
      getForgotPasswordRecord: jest.fn().mockResolvedValue(email),
      deleteForgotPasswordRecord: jest.fn(),
      changePassword: jest.fn(),
    } as any;

    handler = new ResetPasswordHandler(accountStore);
  });

  it('errors for non-string recordIds.', async(): Promise<void> => {
    const errorMessage = 'Invalid request. Open the link from your email again';
    operation = createPostJsonOperation({});
    await expect(handler.handle({ operation })).rejects.toThrow(errorMessage);
    operation = createPostJsonOperation({ recordId: 5 });
    await expect(handler.handle({ operation })).rejects.toThrow(errorMessage);
  });

  it('errors for invalid passwords.', async(): Promise<void> => {
    const errorMessage = 'Your password and confirmation did not match.';
    operation = createPostJsonOperation({ password: 'password!', confirmPassword: 'otherPassword!', recordId }, url);
    await expect(handler.handle({ operation })).rejects.toThrow(errorMessage);
  });

  it('errors for invalid emails.', async(): Promise<void> => {
    const errorMessage = 'This reset password link is no longer valid.';
    operation = createPostJsonOperation({ password: 'password!', confirmPassword: 'password!', recordId }, url);
    (accountStore.getForgotPasswordRecord as jest.Mock).mockResolvedValueOnce(undefined);
    await expect(handler.handle({ operation })).rejects.toThrow(errorMessage);
  });

  it('renders a message on success.', async(): Promise<void> => {
    operation = createPostJsonOperation({ password: 'password!', confirmPassword: 'password!', recordId }, url);
    await expect(handler.handle({ operation })).resolves.toEqual({ type: 'response' });
    expect(accountStore.getForgotPasswordRecord).toHaveBeenCalledTimes(1);
    expect(accountStore.getForgotPasswordRecord).toHaveBeenLastCalledWith(recordId);
    expect(accountStore.deleteForgotPasswordRecord).toHaveBeenCalledTimes(1);
    expect(accountStore.deleteForgotPasswordRecord).toHaveBeenLastCalledWith(recordId);
    expect(accountStore.changePassword).toHaveBeenCalledTimes(1);
    expect(accountStore.changePassword).toHaveBeenLastCalledWith(email, 'password!');
  });
});
