import {
  ClientCredentialsDetailsHandler,
} from '../../../../../src/identity/interaction/client-credentials/ClientCredentialsDetailsHandler';
import type {
  ClientCredentialsIdRoute,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsIdRoute';
import type {
  ClientCredentialsStore,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

describe('A ClientCredentialsDetailsHandler', (): void => {
  const webId = 'http://example.com/card#me';
  const id = '123456';
  const label = 'label_789';
  const accountId = 'accountId';
  const target = { path: 'http://example.com/.account/my_token' };
  let route: jest.Mocked<ClientCredentialsIdRoute>;
  let store: jest.Mocked<ClientCredentialsStore>;
  let handler: ClientCredentialsDetailsHandler;

  beforeEach(async(): Promise<void> => {
    route = {
      getPath: jest.fn().mockReturnValue('http://example.com/foo'),
      matchPath: jest.fn().mockReturnValue({ accountId, clientCredentialsId: id }),
    };

    store = {
      get: jest.fn().mockResolvedValue({ webId, accountId, label }),
    } satisfies Partial<ClientCredentialsStore> as any;

    handler = new ClientCredentialsDetailsHandler(store, route);
  });

  it('returns the necessary information.', async(): Promise<void> => {
    await expect(handler.handle({ target, accountId } as any)).resolves.toEqual({ json: { id: label, webId }});
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
  });

  it('throws a 404 if there is no such token.', async(): Promise<void> => {
    store.get.mockResolvedValueOnce(undefined);
    await expect(handler.handle({ target, accountId } as any)).rejects.toThrow(NotFoundHttpError);
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
  });

  it('throws a 404 if the account is not the owner.', async(): Promise<void> => {
    await expect(handler.handle({ target, accountId: 'otherId' } as any)).rejects.toThrow(NotFoundHttpError);
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
  });
});
