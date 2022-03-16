import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import {
  DeleteClientCredentialsHandler,
} from '../../../../../src/identity/interaction/client-credentials/DeleteClientCredentialsHandler';
import type {
  ClientCredentialsStore,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A DeleteClientCredentialsHandler', (): void => {
  let account: Account;
  const id = 'token_id';
  const target = { path: 'http://example.com/.account/my_token' };
  let accountStore: jest.Mocked<AccountStore>;
  let clientCredentialsStore: jest.Mocked<ClientCredentialsStore>;
  let handler: DeleteClientCredentialsHandler;

  beforeEach(async(): Promise<void> => {
    account = createAccount();
    account.clientCredentials[id] = target.path;

    accountStore = mockAccountStore(account);

    clientCredentialsStore = {
      delete: jest.fn(),
    } as any;

    handler = new DeleteClientCredentialsHandler(accountStore, clientCredentialsStore);
  });

  it('deletes the token.', async(): Promise<void> => {
    await expect(handler.handle({ target, accountId: account.id } as any)).resolves.toEqual({ json: {}});
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith(account.id);
    expect(clientCredentialsStore.delete).toHaveBeenCalledTimes(1);
    expect(clientCredentialsStore.delete).toHaveBeenLastCalledWith(id, account);
  });

  it('throws a 404 if there is no such token.', async(): Promise<void> => {
    delete account.clientCredentials[id];
    await expect(handler.handle({ target, accountId: account.id } as any)).rejects.toThrow(NotFoundHttpError);
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith(account.id);
    expect(clientCredentialsStore.delete).toHaveBeenCalledTimes(0);
  });
});
