import { ForgotPasswordHandler } from '../../../../../src/identity/interaction/password/ForgotPasswordHandler';
import type { EmailSender } from '../../../../../src/identity/interaction/password/util/EmailSender';
import type { ForgotPasswordStore } from '../../../../../src/identity/interaction/password/util/ForgotPasswordStore';
import type { PasswordStore } from '../../../../../src/identity/interaction/password/util/PasswordStore';
import type { InteractionRoute } from '../../../../../src/identity/interaction/routing/InteractionRoute';
import type { TemplateEngine } from '../../../../../src/util/templates/TemplateEngine';

describe('A ForgotPasswordHandler', (): void => {
  const id = 'id';
  const accountId = 'accountId';
  let json: unknown;
  const email = 'test@test.email';
  const recordId = '123456';
  const html = `<a href="/base/idp/resetpassword/?rid=${recordId}">Reset Password</a>`;
  let passwordStore: jest.Mocked<PasswordStore>;
  let forgotPasswordStore: jest.Mocked<ForgotPasswordStore>;
  let templateEngine: TemplateEngine<{ resetLink: string }>;
  let resetRoute: jest.Mocked<InteractionRoute>;
  let emailSender: jest.Mocked<EmailSender>;
  let handler: ForgotPasswordHandler;

  beforeEach(async(): Promise<void> => {
    json = { email };

    passwordStore = {
      findByEmail: jest.fn().mockResolvedValue({ id, accountId }),
    } satisfies Partial<PasswordStore> as any;

    forgotPasswordStore = {
      generate: jest.fn().mockResolvedValue(recordId),
    } satisfies Partial<ForgotPasswordStore> as any;

    templateEngine = {
      handleSafe: jest.fn().mockResolvedValue(html),
    } satisfies Partial<TemplateEngine> as any;

    resetRoute = {
      getPath: jest.fn().mockReturnValue('http://test.com/base/idp/resetpassword/'),
      matchPath: jest.fn(),
    };

    emailSender = {
      handleSafe: jest.fn(),
    } satisfies Partial<EmailSender> as any;

    handler = new ForgotPasswordHandler({
      passwordStore,
      forgotPasswordStore,
      templateEngine,
      emailSender,
      resetRoute,
    });
  });

  it('requires specific input fields.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({
      json: {
        fields: {
          email: {
            required: true,
            type: 'string',
          },
        },
      },
    });
  });

  it('does not send a mail if a ForgotPassword record could not be generated.', async(): Promise<void> => {
    passwordStore.findByEmail.mockResolvedValueOnce(undefined);
    await expect(handler.handle({ json } as any)).resolves.toEqual({ json: { email }});
    expect(passwordStore.findByEmail).toHaveBeenCalledTimes(1);
    expect(passwordStore.findByEmail).toHaveBeenLastCalledWith(email);
    expect(forgotPasswordStore.generate).toHaveBeenCalledTimes(0);
    expect(emailSender.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('sends a mail if a ForgotPassword record could be generated.', async(): Promise<void> => {
    await expect(handler.handle({ json } as any)).resolves.toEqual({ json: { email }});
    expect(passwordStore.findByEmail).toHaveBeenCalledTimes(1);
    expect(passwordStore.findByEmail).toHaveBeenLastCalledWith(email);
    expect(forgotPasswordStore.generate).toHaveBeenCalledTimes(1);
    expect(forgotPasswordStore.generate).toHaveBeenLastCalledWith(id);
    expect(emailSender.handleSafe).toHaveBeenCalledTimes(1);
    expect(emailSender.handleSafe).toHaveBeenLastCalledWith({
      recipient: email,
      subject: 'Reset your password',
      text: `To reset your password, go to this link: http://test.com/base/idp/resetpassword/?rid=${recordId}`,
      html,
    });
  });

  it('catches the error if there was an issue sending the mail.', async(): Promise<void> => {
    emailSender.handleSafe.mockRejectedValueOnce(new Error('bad data'));
    await expect(handler.handle({ json } as any)).resolves.toEqual({ json: { email }});
    expect(passwordStore.findByEmail).toHaveBeenCalledTimes(1);
    expect(passwordStore.findByEmail).toHaveBeenLastCalledWith(email);
    expect(forgotPasswordStore.generate).toHaveBeenCalledTimes(1);
    expect(forgotPasswordStore.generate).toHaveBeenLastCalledWith(id);
    expect(emailSender.handleSafe).toHaveBeenCalledTimes(1);
  });
});
