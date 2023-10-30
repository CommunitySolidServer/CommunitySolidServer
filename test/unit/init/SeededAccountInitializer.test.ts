import { writeJson } from 'fs-extra';
import type { AccountStore } from '../../../src/identity/interaction/account/util/AccountStore';
import type { PasswordStore } from '../../../src/identity/interaction/password/util/PasswordStore';
import type { PodCreator } from '../../../src/identity/interaction/pod/util/PodCreator';
import { SeededAccountInitializer } from '../../../src/init/SeededAccountInitializer';
import { mockFileSystem } from '../../util/Util';

jest.mock('node:fs');
jest.mock('fs-extra');

describe('A SeededAccountInitializer', (): void => {
  const dummyConfig = [
    {
      email: 'hello@example.com',
      password: 'abc123',
      pods: [
        { name: 'pod1' },
        { name: 'pod2' },
        { name: 'pod3' },
      ],
    },
    {
      podName: 'example2',
      email: 'hello2@example.com',
      password: '123abc',
    },
  ];
  const configFilePath = './seeded-pod-config.json';
  let accountStore: jest.Mocked<AccountStore>;
  let passwordStore: jest.Mocked<PasswordStore>;
  let podCreator: jest.Mocked<PodCreator>;
  let initializer: SeededAccountInitializer;

  beforeEach(async(): Promise<void> => {
    let count = 0;
    accountStore = {
      create: jest.fn(async(): Promise<string> => {
        count += 1;
        return `account${count}`;
      }),
    } satisfies Partial<AccountStore> as any;

    let pwCount = 0;
    passwordStore = {
      create: jest.fn(async(): Promise<string> => {
        pwCount += 1;
        return `password${pwCount}`;
      }),
      confirmVerification: jest.fn(),
    } satisfies Partial<PasswordStore> as any;

    podCreator = {
      handleSafe: jest.fn(),
    } satisfies Partial<PodCreator> as any;

    mockFileSystem('/');
    await writeJson(configFilePath, dummyConfig);

    initializer = new SeededAccountInitializer({
      accountStore,
      passwordStore,
      podCreator,
      configFilePath,
    });
  });

  it('does not generate any accounts or pods if no config file is specified.', async(): Promise<void> => {
    await expect(new SeededAccountInitializer({ accountStore, passwordStore, podCreator }).handle())
      .resolves.toBeUndefined();
    expect(accountStore.create).toHaveBeenCalledTimes(0);
  });

  it('errors if the seed file is invalid.', async(): Promise<void> => {
    await writeJson(configFilePath, 'invalid config');
    await expect(initializer.handle()).rejects
      .toThrow('Invalid account seed file: this must be a `array` type, but the final value was: `"invalid config"`.');
  });

  it('generates an account with the specified settings.', async(): Promise<void> => {
    await expect(initializer.handleSafe()).resolves.toBeUndefined();
    expect(accountStore.create).toHaveBeenCalledTimes(2);
    expect(passwordStore.create).toHaveBeenCalledTimes(2);
    expect(passwordStore.create).toHaveBeenNthCalledWith(1, 'hello@example.com', 'account1', 'abc123');
    expect(passwordStore.create).toHaveBeenNthCalledWith(2, 'hello2@example.com', 'account2', '123abc');
    expect(passwordStore.confirmVerification).toHaveBeenCalledTimes(2);
    expect(passwordStore.confirmVerification).toHaveBeenNthCalledWith(1, 'password1');
    expect(passwordStore.confirmVerification).toHaveBeenNthCalledWith(2, 'password2');
    expect(podCreator.handleSafe).toHaveBeenCalledTimes(3);
    expect(podCreator.handleSafe).toHaveBeenNthCalledWith(1, { accountId: 'account1', name: 'pod1', settings: {}});
    expect(podCreator.handleSafe).toHaveBeenNthCalledWith(2, { accountId: 'account1', name: 'pod2', settings: {}});
    expect(podCreator.handleSafe).toHaveBeenNthCalledWith(3, { accountId: 'account1', name: 'pod3', settings: {}});
  });

  it('does not throw exceptions when one of the steps fails.', async(): Promise<void> => {
    accountStore.create.mockRejectedValueOnce(new Error('bad data'));
    await expect(initializer.handleSafe()).resolves.toBeUndefined();
    expect(accountStore.create).toHaveBeenCalledTimes(2);
    // Steps for first account will be skipped due to error
    expect(passwordStore.create).toHaveBeenCalledTimes(1);
    expect(podCreator.handleSafe).toHaveBeenCalledTimes(0);
  });
});
