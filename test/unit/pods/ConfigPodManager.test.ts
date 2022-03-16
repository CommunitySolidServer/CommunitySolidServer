import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { ConfigPodManager } from '../../../src/pods/ConfigPodManager';
import type { PodGenerator } from '../../../src/pods/generate/PodGenerator';
import type { Resource, ResourcesGenerator } from '../../../src/pods/generate/ResourcesGenerator';
import type { PodSettings } from '../../../src/pods/settings/PodSettings';
import type { KeyValueStorage } from '../../../src/storage/keyvalue/KeyValueStorage';
import type { ResourceStore } from '../../../src/storage/ResourceStore';

describe('A ConfigPodManager', (): void => {
  let settings: PodSettings;
  const base = 'http://example.com/';
  let store: ResourceStore;
  let podGenerator: PodGenerator;
  let routingStorage: KeyValueStorage<string, ResourceStore>;
  let generatorData: Resource[];
  let resourcesGenerator: ResourcesGenerator;
  let manager: ConfigPodManager;
  let initStore: ResourceStore;

  beforeEach(async(): Promise<void> => {
    settings = {
      template: 'config-template.json',
      webId: 'webId',
      base: { path: 'http://example.com/alice/' },
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

    initStore = {
      setRepresentation: jest.fn(),
    } as any;
    manager = new ConfigPodManager(podGenerator, resourcesGenerator, routingStorage, initStore);
  });

  it('creates a pod and returns the newly generated identifier.', async(): Promise<void> => {
    const identifier = { path: `${base}alice/` };
    await expect(manager.createPod(settings)).resolves.toBeUndefined();
    expect(podGenerator.generate).toHaveBeenCalledTimes(1);
    expect(podGenerator.generate).toHaveBeenLastCalledWith(settings);
    expect(resourcesGenerator.generate).toHaveBeenCalledTimes(1);
    expect(resourcesGenerator.generate).toHaveBeenLastCalledWith(identifier, settings);
    expect(initStore.setRepresentation).toHaveBeenCalledTimes(2);
    expect(initStore.setRepresentation).toHaveBeenCalledWith({ path: '/path/' }, '/');
    expect(initStore.setRepresentation).toHaveBeenLastCalledWith({ path: '/path/foo' }, '/foo');
    await expect(routingStorage.get(identifier.path)).resolves.toBe(store);
  });
});
