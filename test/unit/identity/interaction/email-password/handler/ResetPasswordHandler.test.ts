import {
  ResetPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/ResetPasswordHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import { createPostFormRequest } from './Util';

describe('A ResetPasswordHandler', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
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
    request = createPostFormRequest({});
    await expect(handler.handle({ request, response })).rejects.toThrow(errorMessage);
    request = createPostFormRequest({}, '');
    await expect(handler.handle({ request, response })).rejects.toThrow(errorMessage);
  });

  it('errors for invalid passwords.', async(): Promise<void> => {
    const errorMessage = 'Your password and confirmation did not match.';
    request = createPostFormRequest({ password: 'password!', confirmPassword: 'otherPassword!' }, url);
    await expect(handler.handle({ request, response })).rejects.toThrow(errorMessage);
  });

  it('errors for invalid emails.', async(): Promise<void> => {
    const errorMessage = 'This reset password link is no longer valid.';
    request = createPostFormRequest({ password: 'password!', confirmPassword: 'password!' }, url);
    (accountStore.getForgotPasswordRecord as jest.Mock).mockResolvedValueOnce(undefined);
    await expect(handler.handle({ request, response })).rejects.toThrow(errorMessage);
  });

  it('renders a message on success.', async(): Promise<void> => {
    request = createPostFormRequest({ password: 'password!', confirmPassword: 'password!' }, url);
    await expect(handler.handle({ request, response })).resolves.toEqual({ type: 'response' });
    expect(accountStore.getForgotPasswordRecord).toHaveBeenCalledTimes(1);
    expect(accountStore.getForgotPasswordRecord).toHaveBeenLastCalledWith(recordId);
    expect(accountStore.deleteForgotPasswordRecord).toHaveBeenCalledTimes(1);
    expect(accountStore.deleteForgotPasswordRecord).toHaveBeenLastCalledWith(recordId);
    expect(accountStore.changePassword).toHaveBeenCalledTimes(1);
    expect(accountStore.changePassword).toHaveBeenLastCalledWith(email, 'password!');
  });

  it('has a default error for non-native errors.', async(): Promise<void> => {
    const errorMessage = 'Unknown error: not native';
    request = createPostFormRequest({ password: 'password!', confirmPassword: 'password!' }, url);
    (accountStore.getForgotPasswordRecord as jest.Mock).mockRejectedValueOnce('not native');
    await expect(handler.handle({ request, response })).rejects.toThrow(errorMessage);
  });
});
