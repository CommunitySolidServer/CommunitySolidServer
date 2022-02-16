import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { AccountStore } from '../../../src/identity/interaction/email-password/storage/AccountStore';
import { SeededPodInitializer } from '../../../src/init/SeededPodInitializer';
import type { IdentifierGenerator } from '../../../src/pods/generate/IdentifierGenerator';
import type { PodManager } from '../../../src/pods/PodManager';
import type { PodSettings } from '../../../src/pods/settings/PodSettings';
import type { KeyValueStorage } from '../../../src/storage/keyvalue/KeyValueStorage';

describe('A SeededPodInitializer', (): void => {
  const baseUrl = 'http://test.com/';
  const webIdSuffix = '/profile/card';
  let configStorage: KeyValueStorage<string, unknown>;
  let identifierGenerator: IdentifierGenerator;
  let accountStore: AccountStore;
  let podManager: PodManager;
  let initializer: SeededPodInitializer;

  const identifierA = 'A';
  const identifierB = 'B';
  const configA = { podName: 'A', email: 'a@test.com', password: 'abc123' };
  const configB = { podName: 'B', email: 'b@test.com', password: '123abc' };
  const podASettings: PodSettings = {
    email: configA.email,
    webId: `${baseUrl}${configA.podName}${webIdSuffix}`,
    podBaseUrl: `${baseUrl}${configA.podName}/`,
    oidcIssuer: baseUrl,
    template: undefined,
  };

  const podBSettings: PodSettings = {
    email: configB.email,
    webId: `${baseUrl}${configB.podName}${webIdSuffix}`,
    podBaseUrl: `${baseUrl}${configB.podName}/`,
    oidcIssuer: baseUrl,
    template: undefined,
  };

  const accountSettingsA = { useIdp: true, podBaseUrl: podASettings.podBaseUrl };
  const accountSettingsB = { useIdp: true, podBaseUrl: podBSettings.podBaseUrl };

  beforeEach(async(): Promise<void> => {
    configStorage = new Map<string, unknown>() as any;
    await configStorage.set(identifierA, configA);
    await configStorage.set(identifierB, configB);

    identifierGenerator = {
      generate: jest.fn((name: string): ResourceIdentifier => ({ path: `${baseUrl}${name}/` })),
    };

    accountStore = {
      create: jest.fn(),
      verify: jest.fn(),
      deleteAccount: jest.fn(),
    } as any;

    podManager = {
      createPod: jest.fn(),
    };

    initializer = new SeededPodInitializer({
      baseUrl,
      webIdSuffix,
      identifierGenerator,
      accountStore,
      podManager,
      configStorage,
    });
  });

  it('generates an account and a pod for every entry in the seeded pod configuration.', async(): Promise<void> => {
    await initializer.handle();
    expect(identifierGenerator.generate).toHaveBeenCalledTimes(2);
    expect(identifierGenerator.generate).toHaveBeenCalledWith(configA.podName);
    expect(identifierGenerator.generate).toHaveBeenCalledWith(configB.podName);
    expect(accountStore.create).toHaveBeenCalledTimes(2);
    expect(accountStore.create).toHaveBeenCalledWith(
      configA.email,
      podASettings.webId,
      configA.password,
      accountSettingsA,
    );
    expect(accountStore.create).toHaveBeenCalledWith(
      configB.email,
      podBSettings.webId,
      configB.password,
      accountSettingsB,
    );
    expect(podManager.createPod).toHaveBeenCalledTimes(2);
    expect(podManager.createPod).toHaveBeenCalledWith({ path: `${baseUrl}${configA.podName}/` }, podASettings, false);
    expect(podManager.createPod).toHaveBeenCalledWith({ path: `${baseUrl}${configB.podName}/` }, podBSettings, false);
    expect(accountStore.verify).toHaveBeenCalledTimes(2);
    expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
  });

  it('deletes the created account if pod generation fails.', async(): Promise<void> => {
    (podManager.createPod as jest.Mock).mockRejectedValueOnce(new Error('pod error'));
    await expect(initializer.handle()).rejects.toThrow('pod error');

    expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
    expect(identifierGenerator.generate).toHaveBeenCalledWith(configA.podName);
    expect(accountStore.create).toHaveBeenCalledTimes(1);
    expect(accountStore.create).toHaveBeenCalledWith(
      configA.email,
      podASettings.webId,
      configA.password,
      accountSettingsA,
    );
    expect(podManager.createPod).toHaveBeenCalledTimes(1);
    expect(podManager.createPod).toHaveBeenCalledWith({ path: `${baseUrl}${configA.podName}/` }, podASettings, false);
    expect(accountStore.deleteAccount).toHaveBeenCalledTimes(1);
    expect(accountStore.deleteAccount).toHaveBeenCalledWith(configA.email);
    expect(accountStore.verify).toHaveBeenCalledTimes(0);
  });
});
