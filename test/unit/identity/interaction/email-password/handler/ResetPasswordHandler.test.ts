import {
  ResetPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/ResetPasswordHandler';
import type {
  ResetPasswordRenderHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/ResetPasswordRenderHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import type { RenderHandler } from '../../../../../../src/server/util/RenderHandler';
import { createPostFormRequest } from './Util';

describe('A ResetPasswordHandler', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
  const recordId = '123456';
  const email = 'alice@test.email';
  let accountStore: AccountStore;
  let renderHandler: ResetPasswordRenderHandler;
  let messageRenderHandler: RenderHandler<{ message: string }>;
  let handler: ResetPasswordHandler;

  beforeEach(async(): Promise<void> => {
    accountStore = {
      getForgotPasswordRecord: jest.fn().mockResolvedValue(email),
      deleteForgotPasswordRecord: jest.fn(),
      changePassword: jest.fn(),
    } as any;

    renderHandler = {
      handleSafe: jest.fn(),
    } as any;

    messageRenderHandler = {
      handleSafe: jest.fn(),
    } as any;

    handler = new ResetPasswordHandler({
      accountStore,
      renderHandler,
      messageRenderHandler,
    });
  });

  it('renders errors for non-string recordIds.', async(): Promise<void> => {
    const errorMessage = 'Invalid request. Open the link from your email again';
    request = createPostFormRequest({});
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId: '' }});
    request = createPostFormRequest({ recordId: [ 'a', 'b' ]});
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(2);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId: '' }});
  });

  it('renders errors for invalid passwords.', async(): Promise<void> => {
    const errorMessage = 'Password and confirmation do not match';
    request = createPostFormRequest({ recordId, password: 'password!', confirmPassword: 'otherPassword!' });
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId }});
  });

  it('renders errors for invalid emails.', async(): Promise<void> => {
    const errorMessage = 'This reset password link is no longer valid.';
    request = createPostFormRequest({ recordId, password: 'password!', confirmPassword: 'password!' });
    (accountStore.getForgotPasswordRecord as jest.Mock).mockResolvedValueOnce(undefined);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId }});
  });

  it('renders a message on success.', async(): Promise<void> => {
    request = createPostFormRequest({ recordId, password: 'password!', confirmPassword: 'password!' });
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(accountStore.getForgotPasswordRecord).toHaveBeenCalledTimes(1);
    expect(accountStore.getForgotPasswordRecord).toHaveBeenLastCalledWith(recordId);
    expect(accountStore.deleteForgotPasswordRecord).toHaveBeenCalledTimes(1);
    expect(accountStore.deleteForgotPasswordRecord).toHaveBeenLastCalledWith(recordId);
    expect(accountStore.changePassword).toHaveBeenCalledTimes(1);
    expect(accountStore.changePassword).toHaveBeenLastCalledWith(email, 'password!');
    expect(messageRenderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(messageRenderHandler.handleSafe)
      .toHaveBeenLastCalledWith({ response, props: { message: 'Your password was successfully reset.' }});
  });

  it('has a default error for non-native errors.', async(): Promise<void> => {
    const errorMessage = 'Unknown error: not native';
    request = createPostFormRequest({ recordId, password: 'password!', confirmPassword: 'password!' });
    (accountStore.getForgotPasswordRecord as jest.Mock).mockRejectedValueOnce('not native');
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId }});
  });
});
