import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import { UnlinkWebIdHandler } from '../../../../../src/identity/interaction/webid/UnlinkWebIdHandler';
import type { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A UnlinkWebIdHandler', (): void => {
  const resource = 'http://example.com/.account/link';
  const webId = 'http://example.com/.account/card#me';
  const accountId = 'accountId';
  let account: Account;
  let accountStore: jest.Mocked<AccountStore>;
  let webIdStore: jest.Mocked<WebIdStore>;
  let handler: UnlinkWebIdHandler;

  beforeEach(async(): Promise<void> => {
    account = createAccount(accountId);
    account.webIds[webId] = resource;

    accountStore = mockAccountStore(account);

    webIdStore = {
      get: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
    };

    handler = new UnlinkWebIdHandler(accountStore, webIdStore);
  });

  it('removes the WebID link.', async(): Promise<void> => {
    await expect(handler.handle({ target: { path: resource }, accountId } as any)).resolves.toEqual({ json: {}});
    expect(webIdStore.delete).toHaveBeenCalledTimes(1);
    expect(webIdStore.delete).toHaveBeenLastCalledWith(webId, account);
  });

  it('errors if there is no matching link resource.', async(): Promise<void> => {
    delete account.webIds[webId];
    await expect(handler.handle({ target: { path: resource }, accountId } as any)).rejects.toThrow(NotFoundHttpError);
  });
});
