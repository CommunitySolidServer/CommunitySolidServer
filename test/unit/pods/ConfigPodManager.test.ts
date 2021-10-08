import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { ConfigPodManager } from '../../../src/pods/ConfigPodManager';
import type { PodGenerator } from '../../../src/pods/generate/PodGenerator';
import type { Resource, ResourcesGenerator } from '../../../src/pods/generate/ResourcesGenerator';
import type { PodSettings } from '../../../src/pods/settings/PodSettings';
import type { KeyValueStorage } from '../../../src/storage/keyvalue/KeyValueStorage';
import type { ResourceStore } from '../../../src/storage/ResourceStore';

describe('A ConfigPodManager', (): void => {
  let settings: PodSettings;
  const base = 'http://test.com/';
  let store: ResourceStore;
  let podGenerator: PodGenerator;
  let routingStorage: KeyValueStorage<string, ResourceStore>;
  let generatorData: Resource[];
  let resourcesGenerator: ResourcesGenerator;
  let manager: ConfigPodManager;

  beforeEach(async(): Promise<void> => {
    settings = {
      login: 'alice',
      template: 'config-template.json',
      webId: 'webId',
    };

    store = {
      setRepresentation: jest.fn(),
    } as any;
    podGenerator = {
      generate: jest.fn().mockResolvedValue(store),
    };

    generatorData = [
      { identifier: { path: '/path/' }, representation: '/' as any },
      { identifier: { path: '/path/foo' }, representation: '/foo' as any },
    ];
    resourcesGenerator = {
      generate: jest.fn(async function* (): any {
        yield* generatorData;
      }),
    };

    const map = new Map();
    routingStorage = {
      get: async(key: ResourceIdentifier): Promise<ResourceStore | undefined> => map.get(key),
      set: async(key: ResourceIdentifier, value: ResourceStore): Promise<any> => map.set(key, value),
    } as any;

    manager = new ConfigPodManager(podGenerator, resourcesGenerator, routingStorage);
  });

  it('creates a pod and returns the newly generated identifier.', async(): Promise<void> => {
    const identifier = { path: `${base}alice/` };
    await expect(manager.createPod(identifier, settings)).resolves.toBeUndefined();
    expect(podGenerator.generate).toHaveBeenCalledTimes(1);
    expect(podGenerator.generate).toHaveBeenLastCalledWith(identifier, settings);
    expect(resourcesGenerator.generate).toHaveBeenCalledTimes(1);
    expect(resourcesGenerator.generate).toHaveBeenLastCalledWith(identifier, settings);
    expect(store.setRepresentation).toHaveBeenCalledTimes(2);
    expect(store.setRepresentation).toHaveBeenCalledWith({ path: '/path/' }, '/');
    expect(store.setRepresentation).toHaveBeenLastCalledWith({ path: '/path/foo' }, '/foo');
    await expect(routingStorage.get(identifier.path)).resolves.toBe(store);
  });
});
