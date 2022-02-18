import type { RegistrationManager } from '../../../src/identity/interaction/email-password/util/RegistrationManager';
import { SeededPodInitializer } from '../../../src/init/SeededPodInitializer';
import type { KeyValueStorage } from '../../../src/storage/keyvalue/KeyValueStorage';

describe('A SeededPodInitializer', (): void => {
  let configStorage: KeyValueStorage<string, unknown>;
  let registrationManager: RegistrationManager;
  let initializer: SeededPodInitializer;

  const identifierA = 'A';
  const identifierB = 'B';
  const configA = { podName: 'A', email: 'a@test.com', password: 'abc123' };
  const configB = { podName: 'B', email: 'b@test.com', password: '123abc' };

  beforeEach(async(): Promise<void> => {
    configStorage = new Map<string, unknown>() as any;
    await configStorage.set(identifierA, configA);
    await configStorage.set(identifierB, configB);

    registrationManager = {
      validateInput: jest.fn((input): any => input),
      register: jest.fn(),
    } as any;

    initializer = new SeededPodInitializer({
      registrationManager,
      configStorage,
    });
  });

  it('generates an account and a pod for every entry in the seeded pod configuration.', async(): Promise<void> => {
    await initializer.handle();
    expect(registrationManager.validateInput).toHaveBeenCalledTimes(2);
    expect(registrationManager.register).toHaveBeenCalledTimes(2);
  });
});
