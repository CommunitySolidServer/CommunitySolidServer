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
      authenticate: jest.fn().mockResolvedValue({ accountId }),
    } satisfies Partial<PasswordStore> as any;

    handler = new PasswordLoginHandler({
      passwordStore,
      accountStore: {} as any,
      cookieStore: {} as any,
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
          password: {
            required: true,
            type: 'string',
          },
          remember: {
            required: false,
            type: 'boolean',
          },
        },
      },
    });
  });

  it('logs the user in.', async(): Promise<void> => {
    await expect(handler.login({ json } as any)).resolves.toEqual({ json: { accountId, remember: false }});

    expect(passwordStore.authenticate).toHaveBeenCalledTimes(1);
    expect(passwordStore.authenticate).toHaveBeenLastCalledWith(email, password);
  });
});
