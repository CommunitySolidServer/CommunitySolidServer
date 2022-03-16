import { PasswordLoginHandler } from '../../../../../src/identity/interaction/password/PasswordLoginHandler';
import type { PasswordStore } from '../../../../../src/identity/interaction/password/util/PasswordStore';

describe('A PasswordLoginHandler', (): void => {
  let json: unknown;
  const accountId = 'accountId';
  const email = 'alice@test.email';
  const password = 'supersecret!';
  let passwordStore: jest.Mocked<PasswordStore>;
  let handler: PasswordLoginHandler;

  beforeEach(async(): Promise<void> => {
    json = { email, password };

    passwordStore = {
      authenticate: jest.fn().mockResolvedValue(accountId),
    } as any;

    handler = new PasswordLoginHandler(passwordStore, {} as any, {} as any);
  });

  it('requires specific input fields.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({
      json: {
        fields: {
          email: {
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

  it('logs the user in.', async(): Promise<void> => {
    await expect(handler.login({ json } as any)).resolves.toEqual({ json: { accountId }});

    expect(passwordStore.authenticate).toHaveBeenCalledTimes(1);
    expect(passwordStore.authenticate).toHaveBeenLastCalledWith(email, password);
  });
});
