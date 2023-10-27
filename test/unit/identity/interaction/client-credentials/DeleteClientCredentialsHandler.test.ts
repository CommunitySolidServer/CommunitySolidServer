import {
  DeleteClientCredentialsHandler,
} from '../../../../../src/identity/interaction/client-credentials/DeleteClientCredentialsHandler';
import type {
  ClientCredentialsIdRoute,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsIdRoute';
import type {
  ClientCredentialsStore,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

describe('A DeleteClientCredentialsHandler', (): void => {
  const id = 'token_id';
  const accountId = 'accountId';
  const target = { path: 'http://example.com/.account/my_token' };
  let route: jest.Mocked<ClientCredentialsIdRoute>;
  let store: jest.Mocked<ClientCredentialsStore>;
  let handler: DeleteClientCredentialsHandler;

  beforeEach(async(): Promise<void> => {
    route = {
      getPath: jest.fn().mockReturnValue(target.path),
      matchPath: jest.fn().mockReturnValue({ accountId, clientCredentialsId: id }),
    };

    store = {
      get: jest.fn().mockResolvedValue({ accountId }),
      delete: jest.fn(),
    } satisfies Partial<ClientCredentialsStore> as any;

    handler = new DeleteClientCredentialsHandler(store, route);
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
