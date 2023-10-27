import { CreatePasswordHandler } from '../../../../../src/identity/interaction/password/CreatePasswordHandler';
import type { PasswordIdRoute } from '../../../../../src/identity/interaction/password/util/PasswordIdRoute';
import type { PasswordStore } from '../../../../../src/identity/interaction/password/util/PasswordStore';

describe('A CreatePasswordHandler', (): void => {
  const id = 'id';
  const accountId = 'accountId';
  const email = 'example@example.com';
  const password = 'supersecret!';
  const resource = 'http://example.com/foo';
  let json: unknown;
  let store: jest.Mocked<PasswordStore>;
  let route: PasswordIdRoute;
  let handler: CreatePasswordHandler;

  beforeEach(async(): Promise<void> => {
    json = { email, password };

    store = {
      create: jest.fn().mockResolvedValue(id),
      findByAccount: jest.fn().mockResolvedValue([{ id: 'id', email }]),
      confirmVerification: jest.fn(),
      delete: jest.fn(),
    } satisfies Partial<PasswordStore> as any;

    route = {
      getPath: jest.fn().mockReturnValue(resource),
      matchPath: jest.fn().mockReturnValue(true),
    };

    handler = new CreatePasswordHandler(store, route);
  });

  it('returns the required input fields and known logins.', async(): Promise<void> => {
    await expect(handler.getView({ accountId } as any)).resolves.toEqual({
      json: {
        passwordLogins: {
          [email]: resource,
        },
        fields: {
          email: { required: true, type: 'string' },
          password: { required: true, type: 'string' },
        },
      },
    });
  });

  it('returns the resource URL of the created login.', async(): Promise<void> => {
    await expect(handler.handle({ accountId, json } as any)).resolves.toEqual({ json: { resource }});
    expect(store.create).toHaveBeenCalledTimes(1);
    expect(store.create).toHaveBeenLastCalledWith(email, accountId, password);
    expect(store.confirmVerification).toHaveBeenCalledTimes(1);
    expect(store.confirmVerification).toHaveBeenLastCalledWith(id);
  });
});
