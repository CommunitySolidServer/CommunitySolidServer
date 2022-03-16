import type { Account } from '../../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../../src/identity/interaction/account/util/AccountStore';
import type { PodIdRoute } from '../../../../../../src/identity/interaction/pod/PodIdRoute';
import { BasePodStore } from '../../../../../../src/identity/interaction/pod/util/BasePodStore';
import type { PodManager } from '../../../../../../src/pods/PodManager';
import type { PodSettings } from '../../../../../../src/pods/settings/PodSettings';
import { createAccount, mockAccountStore } from '../../../../../util/AccountUtil';

describe('A BasePodStore', (): void => {
  let account: Account;
  const settings: PodSettings = { webId: 'http://example.com/card#me', base: { path: 'http://example.com/foo' }};
  const route: PodIdRoute = {
    getPath: (): string => 'http://example.com/.account/resource',
    matchPath: (): any => ({}),
  };
  let accountStore: jest.Mocked<AccountStore>;
  let manager: jest.Mocked<PodManager>;
  let store: BasePodStore;

  beforeEach(async(): Promise<void> => {
    account = createAccount();

    accountStore = mockAccountStore(createAccount());

    manager = {
      createPod: jest.fn(),
    };

    store = new BasePodStore(accountStore, route, manager);
  });

  it('calls the pod manager to create a pod.', async(): Promise<void> => {
    await expect(store.create(account, settings, false)).resolves.toBe('http://example.com/.account/resource');
    expect(manager.createPod).toHaveBeenCalledTimes(1);
    expect(manager.createPod).toHaveBeenLastCalledWith(settings, false);
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.pods['http://example.com/foo']).toBe('http://example.com/.account/resource');
  });

  it('does not update the account if something goes wrong.', async(): Promise<void> => {
    manager.createPod.mockRejectedValueOnce(new Error('bad data'));
    await expect(store.create(account, settings, false)).rejects.toThrow('Pod creation failed: bad data');
    expect(manager.createPod).toHaveBeenCalledTimes(1);
    expect(manager.createPod).toHaveBeenLastCalledWith(settings, false);
    expect(accountStore.update).toHaveBeenCalledTimes(2);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.pods).toEqual({});
  });
});
