import { UpdatePasswordHandler } from '../../../../../src/identity/interaction/password/UpdatePasswordHandler';
import type { PasswordIdRoute } from '../../../../../src/identity/interaction/password/util/PasswordIdRoute';
import type { PasswordStore } from '../../../../../src/identity/interaction/password/util/PasswordStore';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

describe('An UpdatePasswordHandler', (): void => {
  let json: unknown;
  const id = 'id';
  const accountId = 'accountId';
  const email = 'email@example.com';
  const target = { path: 'http://example.com/.account/password' };
  const oldPassword = 'oldPassword!';
  const newPassword = 'newPassword!';
  let store: jest.Mocked<PasswordStore>;
  let route: jest.Mocked<PasswordIdRoute>;
  let handler: UpdatePasswordHandler;

  beforeEach(async(): Promise<void> => {
    json = { oldPassword, newPassword };

    store = {
      get: jest.fn().mockResolvedValue({ email, accountId }),
      authenticate: jest.fn(),
      update: jest.fn(),
    } satisfies Partial<PasswordStore> as any;

    route = {
      getPath: jest.fn().mockReturnValue(''),
      matchPath: jest.fn().mockReturnValue({ accountId, passwordId: id }),
    };

    handler = new UpdatePasswordHandler(store, route);
  });

  it('requires specific input fields.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({
      json: {
        fields: {
          oldPassword: { required: true, type: 'string' },
          newPassword: { required: true, type: 'string' },
        },
      },
    });
  });

  it('updates the password.', async(): Promise<void> => {
    await expect(handler.handle({ json, accountId, target } as any)).resolves.toEqual({ json: {}});
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.authenticate).toHaveBeenCalledTimes(1);
    expect(store.authenticate).toHaveBeenLastCalledWith(email, oldPassword);
    expect(store.update).toHaveBeenCalledTimes(1);
    expect(store.update).toHaveBeenLastCalledWith(id, newPassword);
  });

  it('errors if authentication fails.', async(): Promise<void> => {
    store.authenticate.mockRejectedValueOnce(new Error('bad data'));
    await expect(handler.handle({ json, accountId, target } as any))
      .rejects.toThrow('Old password is invalid.');
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.authenticate).toHaveBeenCalledTimes(1);
    expect(store.authenticate).toHaveBeenLastCalledWith(email, oldPassword);
    expect(store.update).toHaveBeenCalledTimes(0);
  });

  it('throws a 404 if the authenticated accountId is not the owner.', async(): Promise<void> => {
    await expect(handler.handle({ target, json, accountId: 'otherId' } as any)).rejects.toThrow(NotFoundHttpError);
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.authenticate).toHaveBeenCalledTimes(0);
    expect(store.update).toHaveBeenCalledTimes(0);
  });
});
