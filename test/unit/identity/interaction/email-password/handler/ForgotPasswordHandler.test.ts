import {
  ForgotPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/ForgotPasswordHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { EmailSender } from '../../../../../../src/identity/interaction/util/EmailSender';
import type { Operation } from '../../../../../../src/ldp/operations/Operation';
import type { TemplateEngine } from '../../../../../../src/util/templates/TemplateEngine';
import { createPostJsonOperation } from './Util';

describe('A ForgotPasswordHandler', (): void => {
  let operation: Operation;
  const email = 'test@test.email';
  const recordId = '123456';
  const html = `<a href="/base/idp/resetpassword/${recordId}">Reset Password</a>`;
  let accountStore: AccountStore;
  const baseUrl = 'http://test.com/base/';
  const idpPath = '/idp';
  let templateEngine: TemplateEngine<{ resetLink: string }>;
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

    emailSender = {
      handleSafe: jest.fn(),
    } as any;

    handler = new ForgotPasswordHandler({
      accountStore,
      baseUrl,
      idpPath,
      templateEngine,
      emailSender,
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
    await expect(handler.handle({ operation })).resolves
      .toEqual({ type: 'response', details: { email }});
    expect(emailSender.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('sends a mail if a ForgotPassword record could be generated.', async(): Promise<void> => {
    await expect(handler.handle({ operation })).resolves
      .toEqual({ type: 'response', details: { email }});
    expect(emailSender.handleSafe).toHaveBeenCalledTimes(1);
    expect(emailSender.handleSafe).toHaveBeenLastCalledWith({
      recipient: email,
      subject: 'Reset your password',
      text: `To reset your password, go to this link: http://test.com/base/idp/resetpassword/${recordId}`,
      html,
    });
  });
});
