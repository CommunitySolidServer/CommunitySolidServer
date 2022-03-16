import { writeJson } from 'fs-extra';
import type { JsonInteractionHandler } from '../../../src/identity/interaction/JsonInteractionHandler';
import type { ResolveLoginHandler } from '../../../src/identity/interaction/login/ResolveLoginHandler';
import { SeededAccountInitializer } from '../../../src/init/SeededAccountInitializer';
import { mockFileSystem } from '../../util/Util';

jest.mock('fs');
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
  let accountHandler: jest.Mocked<ResolveLoginHandler>;
  let passwordHandler: jest.Mocked<JsonInteractionHandler>;
  let podHandler: jest.Mocked<JsonInteractionHandler>;
  let initializer: SeededAccountInitializer;

  beforeEach(async(): Promise<void> => {
    let count = 0;
    accountHandler = {
      login: jest.fn(async(): Promise<unknown> => {
        count += 1;
        return { json: { accountId: `account${count}` }};
      }),
    } as any;

    passwordHandler = {
      handleSafe: jest.fn(),
    } as any;

    podHandler = {
      handleSafe: jest.fn(),
    } as any;

    mockFileSystem('/');
    await writeJson(configFilePath, dummyConfig);

    initializer = new SeededAccountInitializer({
      accountHandler, passwordHandler, podHandler, configFilePath,
    });
  });

  it('does not generate any accounts or pods if no config file is specified.', async(): Promise<void> => {
    await expect(new SeededAccountInitializer({ accountHandler, passwordHandler, podHandler }).handle())
      .resolves.toBeUndefined();
    expect(accountHandler.login).toHaveBeenCalledTimes(0);
  });

  it('errors if the seed file is invalid.', async(): Promise<void> => {
    await writeJson(configFilePath, 'invalid config');
    await expect(initializer.handle()).rejects
      .toThrow('Invalid account seed file: this must be a `array` type, but the final value was: `"invalid config"`.');
  });

  it('generates an account with the specified settings.', async(): Promise<void> => {
    await expect(initializer.handleSafe()).resolves.toBeUndefined();
    expect(accountHandler.login).toHaveBeenCalledTimes(2);
    expect(passwordHandler.handleSafe).toHaveBeenCalledTimes(2);
    expect(passwordHandler.handleSafe.mock.calls[0][0].json)
      .toEqual(expect.objectContaining({ email: 'hello@example.com', password: 'abc123' }));
    expect(passwordHandler.handleSafe.mock.calls[1][0].json)
      .toEqual(expect.objectContaining({ email: 'hello2@example.com', password: '123abc' }));
    expect(podHandler.handleSafe).toHaveBeenCalledTimes(3);
    expect(podHandler.handleSafe.mock.calls[0][0].json).toEqual(expect.objectContaining(dummyConfig[0].pods![0]));
    expect(podHandler.handleSafe.mock.calls[1][0].json).toEqual(expect.objectContaining(dummyConfig[0].pods![1]));
    expect(podHandler.handleSafe.mock.calls[2][0].json).toEqual(expect.objectContaining(dummyConfig[0].pods![2]));
  });

  it('does not throw exceptions when one of the steps fails.', async(): Promise<void> => {
    accountHandler.login.mockRejectedValueOnce(new Error('bad data'));
    await expect(initializer.handleSafe()).resolves.toBeUndefined();
    expect(accountHandler.login).toHaveBeenCalledTimes(2);
    // Steps for first account will be skipped due to error
    expect(passwordHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(podHandler.handleSafe).toHaveBeenCalledTimes(0);
  });
});
