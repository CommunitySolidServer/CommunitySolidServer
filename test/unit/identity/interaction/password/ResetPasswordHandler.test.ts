import { ResetPasswordHandler } from '../../../../../src/identity/interaction/password/ResetPasswordHandler';
import type { ForgotPasswordStore } from '../../../../../src/identity/interaction/password/util/ForgotPasswordStore';
import type { PasswordStore } from '../../../../../src/identity/interaction/password/util/PasswordStore';

describe('A ResetPasswordHandler', (): void => {
  let json: unknown;
  const email = 'test@test.email';
  const password = 'newsecret!';
  const recordId = '123456';
  let passwordStore: jest.Mocked<PasswordStore>;
  let forgotPasswordStore: jest.Mocked<ForgotPasswordStore>;
  let handler: ResetPasswordHandler;

  beforeEach(async(): Promise<void> => {
    json = { password, recordId };

    passwordStore = {
      update: jest.fn(),
    } as any;

    forgotPasswordStore = {
      get: jest.fn().mockResolvedValue(email),
      delete: jest.fn(),
    } as any;

    handler = new ResetPasswordHandler(passwordStore, forgotPasswordStore);
  });

  it('requires specific input fields.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({
      json: {
        fields: {
          recordId: {
            required: true,
            type: 'string',
          },
          password: {
            required: true,
            type: 'string',
          },
        },
      },
    });
  });

  it('can reset a password.', async(): Promise<void> => {
    await expect(handler.handle({ json } as any)).resolves.toEqual({ json: {}});
    expect(forgotPasswordStore.get).toHaveBeenCalledTimes(1);
    expect(forgotPasswordStore.get).toHaveBeenLastCalledWith(recordId);
    expect(forgotPasswordStore.delete).toHaveBeenCalledTimes(1);
    expect(forgotPasswordStore.delete).toHaveBeenLastCalledWith(recordId);
    expect(passwordStore.update).toHaveBeenCalledTimes(1);
    expect(passwordStore.update).toHaveBeenLastCalledWith(email, password);
  });

  it('throws an error if no matching email was found.', async(): Promise<void> => {
    forgotPasswordStore.get.mockResolvedValueOnce(undefined);
    await expect(handler.handle({ json } as any)).rejects.toThrow('This reset password link is no longer valid.');
    expect(forgotPasswordStore.get).toHaveBeenCalledTimes(1);
    expect(forgotPasswordStore.get).toHaveBeenLastCalledWith(recordId);
    expect(forgotPasswordStore.delete).toHaveBeenCalledTimes(0);
    expect(passwordStore.update).toHaveBeenCalledTimes(0);
  });
});
