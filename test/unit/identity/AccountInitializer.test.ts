import { AccountInitializer } from '../../../src/identity/AccountInitializer';
import type { AccountStore } from '../../../src/identity/interaction/account/util/AccountStore';
import type { PasswordStore } from '../../../src/identity/interaction/password/util/PasswordStore';
import type { PodCreator } from '../../../src/identity/interaction/pod/util/PodCreator';

describe('An AccountInitializer', (): void => {
  const email = 'email@example.com';
  const password = 'password!';
  let accountStore: jest.Mocked<AccountStore>;
  let passwordStore: jest.Mocked<PasswordStore>;
  let podCreator: jest.Mocked<PodCreator>;
  let initializer: AccountInitializer;

  beforeEach(async(): Promise<void> => {
    accountStore = {
      create: jest.fn().mockResolvedValue('account-id'),
    } satisfies Partial<AccountStore> as any;

    passwordStore = {
      create: jest.fn().mockResolvedValue('password-id'),
      confirmVerification: jest.fn(),
    } satisfies Partial<PasswordStore> as any;

    podCreator = {
      handleSafe: jest.fn(),
    } satisfies Partial<PodCreator> as any;

    initializer = new AccountInitializer({
      accountStore,
      passwordStore,
      podCreator,
      email,
      password,
    });
  });

  it('creates the account/login/pod.', async(): Promise<void> => {
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(accountStore.create).toHaveBeenCalledTimes(1);
    expect(passwordStore.create).toHaveBeenCalledTimes(1);
    expect(passwordStore.create).toHaveBeenLastCalledWith(email, 'account-id', password);
    expect(passwordStore.confirmVerification).toHaveBeenCalledTimes(1);
    expect(podCreator.handleSafe).toHaveBeenCalledTimes(1);
    expect(podCreator.handleSafe).toHaveBeenLastCalledWith({ accountId: 'account-id' });
  });

  it('can create a pod with a name.', async(): Promise<void> => {
    initializer = new AccountInitializer({
      accountStore,
      passwordStore,
      podCreator,
      email,
      password,
      name: 'name',
    });
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(accountStore.create).toHaveBeenCalledTimes(1);
    expect(passwordStore.create).toHaveBeenCalledTimes(1);
    expect(passwordStore.create).toHaveBeenLastCalledWith(email, 'account-id', password);
    expect(passwordStore.confirmVerification).toHaveBeenCalledTimes(1);
    expect(podCreator.handleSafe).toHaveBeenCalledTimes(1);
    expect(podCreator.handleSafe).toHaveBeenLastCalledWith({ accountId: 'account-id', name: 'name' });
  });
});
