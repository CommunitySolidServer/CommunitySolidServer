import {
  EmailPasswordResetPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordResetPasswordHandler';
import type {
  EmailPasswordResetPasswordRenderHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordResetPasswordRenderHandler';
import type {
  EmailPasswordStore,
} from '../../../../../../src/identity/interaction/email-password/storage/EmailPasswordStore';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import type { RenderHandler } from '../../../../../../src/server/util/RenderHandler';
import { createRequest } from './Util';

describe('An EmailPasswordResetPasswordHandler', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = 'response!' as any;
  const recordId = 'recordId!';
  let emailPasswordStorageAdapter: EmailPasswordStore;
  let renderHandler: EmailPasswordResetPasswordRenderHandler;
  let messageRenderHandler: RenderHandler<{ message: string }>;
  let handler: EmailPasswordResetPasswordHandler;

  beforeEach(async(): Promise<void> => {
    emailPasswordStorageAdapter = {
      getForgotPasswordRecord: jest.fn().mockResolvedValue('email!'),
      deleteForgotPasswordRecord: jest.fn(),
      changePassword: jest.fn(),
    } as any;

    renderHandler = {
      handleSafe: jest.fn(),
    } as any;

    messageRenderHandler = {
      handleSafe: jest.fn(),
    } as any;

    handler = new EmailPasswordResetPasswordHandler({
      emailPasswordStorageAdapter,
      renderHandler,
      messageRenderHandler,
    });
  });

  it('renders errors for non-string recordIds.', async(): Promise<void> => {
    const errorMessage = 'Invalid request. Open the link from your email again';
    request = createRequest({});
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId: '' }});
    request = createRequest({ recordId: [ 'a', 'b' ]});
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(2);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId: '' }});
  });

  it('renders errors for invalid passwords.', async(): Promise<void> => {
    const errorMessage = 'Password and confirm password do not match';
    request = createRequest({ recordId, password: 'password!', confirmPassword: 'otherPassword!' });
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId }});
  });

  it('renders errors for invalid emails.', async(): Promise<void> => {
    const errorMessage = 'This reset password link is no longer valid.';
    request = createRequest({ recordId, password: 'password!', confirmPassword: 'password!' });
    (emailPasswordStorageAdapter.getForgotPasswordRecord as jest.Mock).mockResolvedValueOnce(undefined);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId }});
  });

  it('renders a message on success.', async(): Promise<void> => {
    request = createRequest({ recordId, password: 'password!', confirmPassword: 'password!' });
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(emailPasswordStorageAdapter.getForgotPasswordRecord).toHaveBeenCalledTimes(1);
    expect(emailPasswordStorageAdapter.getForgotPasswordRecord).toHaveBeenLastCalledWith(recordId);
    expect(emailPasswordStorageAdapter.deleteForgotPasswordRecord).toHaveBeenCalledTimes(1);
    expect(emailPasswordStorageAdapter.deleteForgotPasswordRecord).toHaveBeenLastCalledWith(recordId);
    expect(emailPasswordStorageAdapter.changePassword).toHaveBeenCalledTimes(1);
    expect(emailPasswordStorageAdapter.changePassword).toHaveBeenLastCalledWith('email!', 'password!');
    expect(messageRenderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(messageRenderHandler.handleSafe)
      .toHaveBeenLastCalledWith({ response, props: { message: 'Your password was successfully reset.' }});
  });

  it('has a default error for non-native errors.', async(): Promise<void> => {
    const errorMessage = 'An unknown error occurred';
    request = createRequest({ recordId, password: 'password!', confirmPassword: 'password!' });
    (emailPasswordStorageAdapter.getForgotPasswordRecord as jest.Mock).mockRejectedValueOnce('not native');
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({ response, props: { errorMessage, recordId }});
  });
});
