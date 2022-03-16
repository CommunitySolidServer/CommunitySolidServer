import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import {
  ClientCredentialsDetailsHandler,
} from '../../../../../src/identity/interaction/client-credentials/ClientCredentialsDetailsHandler';
import type {
  ClientCredentialsStore,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import { InternalServerError } from '../../../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A ClientCredentialsDetailsHandler', (): void => {
  const webId = 'http://example.com/card#me';
  const id = 'token_id';
  const target = { path: 'http://example.com/.account/my_token' };
  let account: Account;
  let accountStore: jest.Mocked<AccountStore>;
  let clientCredentialsStore: jest.Mocked<ClientCredentialsStore>;
  let handler: ClientCredentialsDetailsHandler;

  beforeEach(async(): Promise<void> => {
    account = createAccount();
    account.clientCredentials[id] = target.path;

    accountStore = mockAccountStore(account);

    clientCredentialsStore = {
      get: jest.fn().mockResolvedValue({ webId, accountId: account.id, secret: 'ssh!' }),
    } as any;

    handler = new ClientCredentialsDetailsHandler(accountStore, clientCredentialsStore);
  });

  it('returns the necessary information.', async(): Promise<void> => {
    await expect(handler.handle({ target, accountId: account.id } as any)).resolves.toEqual({ json: { id, webId }});
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith(account.id);
    expect(clientCredentialsStore.get).toHaveBeenCalledTimes(1);
    expect(clientCredentialsStore.get).toHaveBeenLastCalledWith(id);
  });

  it('throws a 404 if there is no such token.', async(): Promise<void> => {
    delete account.clientCredentials[id];
    await expect(handler.handle({ target, accountId: account.id } as any)).rejects.toThrow(NotFoundHttpError);
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith(account.id);
    expect(clientCredentialsStore.get).toHaveBeenCalledTimes(0);
  });

  it('throws an error if there is a data mismatch.', async(): Promise<void> => {
    clientCredentialsStore.get.mockResolvedValueOnce(undefined);
    await expect(handler.handle({ target, accountId: account.id } as any)).rejects.toThrow(InternalServerError);
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith(account.id);
    expect(clientCredentialsStore.get).toHaveBeenCalledTimes(1);
    expect(clientCredentialsStore.get).toHaveBeenLastCalledWith(id);
  });
});
