import type { Provider } from 'oidc-provider';
import {
  EmailPasswordForgotPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordForgotPasswordHandler';
import type {
  EmailPasswordStore,
} from '../../../../../../src/identity/interaction/email-password/storage/EmailPasswordStore';
import type { EmailSender } from '../../../../../../src/identity/interaction/util/EmailSender';
import type { IdpRenderHandler } from '../../../../../../src/identity/interaction/util/IdpRenderHandler';
import type { TemplateRenderer } from '../../../../../../src/identity/interaction/util/TemplateRenderer';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import { createRequest } from './Util';

describe('EmailPasswordForgotPasswordHandler', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = 'response!' as any;
  const renderParams = { response, props: { details: 'details!', errorMessage: '', prefilled: { email: 'email!' }}};
  let provider: Provider;
  let messageRenderHandler: IdpRenderHandler;
  let emailPasswordStorageAdapter: EmailPasswordStore;
  const baseUrl = 'http://test.com/base/';
  let emailTemplateRenderer: TemplateRenderer<{ resetLink: string }>;
  let emailSender: EmailSender;
  let handler: EmailPasswordForgotPasswordHandler;

  beforeEach(async(): Promise<void> => {
    request = createRequest({ email: 'email!' });

    provider = {
      interactionDetails: jest.fn().mockResolvedValue('details!'),
    } as any;

    messageRenderHandler = {
      handleSafe: jest.fn(),
    } as any;

    emailPasswordStorageAdapter = {
      generateForgotPasswordRecord: jest.fn().mockResolvedValue('record!'),
    } as any;

    emailTemplateRenderer = {
      render: jest.fn().mockResolvedValue('html!'),
    };

    emailSender = {
      sendEmail: jest.fn(),
    } as any;

    handler = new EmailPasswordForgotPasswordHandler({
      messageRenderHandler,
      emailPasswordStorageAdapter,
      baseUrl,
      emailTemplateRenderer,
      emailSender,
    });
  });

  it('errors on non-string emails.', async(): Promise<void> => {
    request = createRequest({});
    await expect(handler.handle({ request, response, provider })).rejects.toThrow('Email required');
    request = createRequest({ email: [ 'email', 'email2' ]});
    await expect(handler.handle({ request, response, provider })).rejects.toThrow('Email required');
  });

  it('does not send a mail if a ForgotPassword record could not be generated.', async(): Promise<void> => {
    (emailPasswordStorageAdapter.generateForgotPasswordRecord as jest.Mock).mockRejectedValueOnce('error');
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(emailSender.sendEmail).toHaveBeenCalledTimes(0);
    expect(messageRenderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(messageRenderHandler.handleSafe).toHaveBeenLastCalledWith(renderParams);
  });

  it('sends a mail if a ForgotPassword record could be generated.', async(): Promise<void> => {
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(emailSender.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailSender.sendEmail).toHaveBeenLastCalledWith('email!', {
      subject: 'Reset your password',
      text: 'To reset your password, go to this link: http://test.com/base/idp/resetpassword?rid=record!',
      html: 'html!',
    });
    expect(messageRenderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(messageRenderHandler.handleSafe).toHaveBeenLastCalledWith(renderParams);
  });
});
