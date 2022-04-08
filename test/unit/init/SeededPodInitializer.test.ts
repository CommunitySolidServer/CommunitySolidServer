import { promises as fsPromises } from 'fs';
import type { RegistrationManager } from '../../../src/identity/interaction/email-password/util/RegistrationManager';
import { SeededPodInitializer } from '../../../src/init/SeededPodInitializer';
import { mockFs } from '../../util/Util';

jest.mock('fs');

describe('A SeededPodInitializer', (): void => {
  const dummyConfig = JSON.stringify([
    {
      podName: 'example',
      email: 'hello@example.com',
      password: 'abc123',
    },
    {
      podName: 'example2',
      email: 'hello2@example.com',
      password: '123abc',
    },
  ]);
  let registrationManager: RegistrationManager;
  let configFilePath: string | null;

  beforeEach(async(): Promise<void> => {
    configFilePath = './seeded-pod-config.json';
    registrationManager = {
      validateInput: jest.fn((input): any => input),
      register: jest.fn(),
    } as any;

    mockFs('/');
    await fsPromises.writeFile(configFilePath, dummyConfig);
  });

  it('does not generate any accounts or pods if no config file is specified.', async(): Promise<void> => {
    configFilePath = null;
    await new SeededPodInitializer(registrationManager, configFilePath).handle();
    expect(registrationManager.validateInput).not.toHaveBeenCalled();
    expect(registrationManager.register).not.toHaveBeenCalled();
  });

  it('generates an account and a pod for every entry in the seeded pod configuration.', async(): Promise<void> => {
    await new SeededPodInitializer(registrationManager, configFilePath).handle();
    expect(registrationManager.validateInput).toHaveBeenCalledTimes(2);
    expect(registrationManager.register).toHaveBeenCalledTimes(2);
  });
});
