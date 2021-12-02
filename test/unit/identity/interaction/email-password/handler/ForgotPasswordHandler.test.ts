import type { Operation } from '../../../../../../src/http/Operation';
import {
  ForgotPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/ForgotPasswordHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { InteractionRoute } from '../../../../../../src/identity/interaction/routing/InteractionRoute';
import type { EmailSender } from '../../../../../../src/identity/interaction/util/EmailSender';
import { readJsonStream } from '../../../../../../src/util/StreamUtil';
import type { TemplateEngine } from '../../../../../../src/util/templates/TemplateEngine';
import { createPostJsonOperation } from './Util';

describe('A ForgotPasswordHandler', (): void => {
  let operation: Operation;
  const email = 'test@test.email';
  const recordId = '123456';
  const html = `<a href="/base/idp/resetpassword/?rid=${recordId}">Reset Password</a>`;
  let accountStore: AccountStore;
  let templateEngine: TemplateEngine<{ resetLink: string }>;
  let resetRoute: jest.Mocked<InteractionRoute>;
  let emailSender: EmailSender;
  let handler: ForgotPasswordHandler;

  beforeEach(async(): Promise<void> => {
    operation = createPostJsonOperation({ email });

    accountStore = {
      generateForgotPasswordRecord: jest.fn().mockResolvedValue(recordId),
    } as any;

    templateEngine = {
      render: jest.fn().mockResolvedValue(html),
    } as any;

    resetRoute = {
      getPath: jest.fn().mockReturnValue('http://test.com/base/idp/resetpassword/'),
    } as any;

    emailSender = {
      handleSafe: jest.fn(),
    } as any;

    handler = new ForgotPasswordHandler({
      accountStore,
      templateEngine,
      emailSender,
      resetRoute,
    });
  });

  it('errors on non-string emails.', async(): Promise<void> => {
    operation = createPostJsonOperation({});
    await expect(handler.handle({ operation })).rejects.toThrow('Email required');
    operation = createPostJsonOperation({ email: [ 'email', 'email2' ]});
    await expect(handler.handle({ operation })).rejects.toThrow('Email required');
  });

  it('does not send a mail if a ForgotPassword record could not be generated.', async(): Promise<void> => {
    (accountStore.generateForgotPasswordRecord as jest.Mock).mockRejectedValueOnce('error');
    const result = await handler.handle({ operation });
    await expect(readJsonStream(result.data)).resolves.toEqual({ email });
    expect(emailSender.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('sends a mail if a ForgotPassword record could be generated.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    await expect(readJsonStream(result.data)).resolves.toEqual({ email });
    expect(result.metadata.contentType).toBe('application/json');
    expect(emailSender.handleSafe).toHaveBeenCalledTimes(1);
    expect(emailSender.handleSafe).toHaveBeenLastCalledWith({
      recipient: email,
      subject: 'Reset your password',
      text: `To reset your password, go to this link: http://test.com/base/idp/resetpassword/?rid=${recordId}`,
      html,
    });
  });
});
