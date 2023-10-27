import { DeletePasswordHandler } from '../../../../../src/identity/interaction/password/DeletePasswordHandler';
import type { PasswordIdRoute } from '../../../../../src/identity/interaction/password/util/PasswordIdRoute';
import type { PasswordStore } from '../../../../../src/identity/interaction/password/util/PasswordStore';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

describe('A DeletePasswordHandler', (): void => {
  const id = 'id';
  const accountId = 'accountId';
  const email = 'example@example.com';
  const target = { path: 'http://example.com/.account/password' };
  let store: jest.Mocked<PasswordStore>;
  let route: jest.Mocked<PasswordIdRoute>;
  let handler: DeletePasswordHandler;

  beforeEach(async(): Promise<void> => {
    store = {
      get: jest.fn().mockResolvedValue({ email, accountId }),
      delete: jest.fn(),
    } satisfies Partial<PasswordStore> as any;

    route = {
      getPath: jest.fn().mockReturnValue(''),
      matchPath: jest.fn().mockReturnValue({ accountId, passwordId: id }),
    };

    handler = new DeletePasswordHandler(store, route);
  });

  it('deletes the token.', async(): Promise<void> => {
    await expect(handler.handle({ target, accountId } as any)).resolves.toEqual({ json: {}});
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.delete).toHaveBeenCalledTimes(1);
    expect(store.delete).toHaveBeenLastCalledWith(id);
  });

  it('throws a 404 if the authenticated accountId is not the owner.', async(): Promise<void> => {
    await expect(handler.handle({ target, accountId: 'otherId' } as any)).rejects.toThrow(NotFoundHttpError);
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.delete).toHaveBeenCalledTimes(0);
  });
});
