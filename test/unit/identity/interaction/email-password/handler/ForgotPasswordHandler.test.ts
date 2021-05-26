import type { Provider } from 'oidc-provider';
import {
  ForgotPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/ForgotPasswordHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { EmailSender } from '../../../../../../src/identity/interaction/util/EmailSender';
import type { IdpRenderHandler } from '../../../../../../src/identity/interaction/util/IdpRenderHandler';
import type { TemplateRenderer } from '../../../../../../src/identity/interaction/util/TemplateRenderer';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import { createPostFormRequest } from './Util';

describe('A ForgotPasswordHandler', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
  const email = 'test@test.email';
  const recordId = '123456';
  const html = `<a href="/base/idp/resetpassword?rid=${recordId}">Reset Password</a>`;
  const renderParams = { response, props: { errorMessage: '', prefilled: { email }}};
  const provider: Provider = {} as any;
  let messageRenderHandler: IdpRenderHandler;
  let accountStore: AccountStore;
  const baseUrl = 'http://test.com/base/';
  const idpPath = '/idp';
  let emailTemplateRenderer: TemplateRenderer<{ resetLink: string }>;
  let emailSender: EmailSender;
  let handler: ForgotPasswordHandler;

  beforeEach(async(): Promise<void> => {
    request = createPostFormRequest({ email });

    messageRenderHandler = {
      handleSafe: jest.fn(),
    } as any;

    accountStore = {
      generateForgotPasswordRecord: jest.fn().mockResolvedValue(recordId),
    } as any;

    emailTemplateRenderer = {
      handleSafe: jest.fn().mockResolvedValue(html),
    } as any;

    emailSender = {
      handleSafe: jest.fn(),
    } as any;

    handler = new ForgotPasswordHandler({
      messageRenderHandler,
      accountStore,
      baseUrl,
      idpPath,
      emailTemplateRenderer,
      emailSender,
    });
  });

  it('errors on non-string emails.', async(): Promise<void> => {
    request = createPostFormRequest({});
    await expect(handler.handle({ request, response, provider })).rejects.toThrow('Email required');
    request = createPostFormRequest({ email: [ 'email', 'email2' ]});
    await expect(handler.handle({ request, response, provider })).rejects.toThrow('Email required');
  });

  it('does not send a mail if a ForgotPassword record could not be generated.', async(): Promise<void> => {
    (accountStore.generateForgotPasswordRecord as jest.Mock).mockRejectedValueOnce('error');
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(emailSender.handleSafe).toHaveBeenCalledTimes(0);
    expect(messageRenderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(messageRenderHandler.handleSafe).toHaveBeenLastCalledWith(renderParams);
  });

  it('sends a mail if a ForgotPassword record could be generated.', async(): Promise<void> => {
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(emailSender.handleSafe).toHaveBeenCalledTimes(1);
    expect(emailSender.handleSafe).toHaveBeenLastCalledWith({
      recipient: email,
      subject: 'Reset your password',
      text: `To reset your password, go to this link: http://test.com/base/idp/resetpassword?rid=${recordId}`,
      html,
    });
    expect(messageRenderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(messageRenderHandler.handleSafe).toHaveBeenLastCalledWith(renderParams);
  });
});
