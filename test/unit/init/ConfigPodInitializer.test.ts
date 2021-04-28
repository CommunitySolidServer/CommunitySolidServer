import { ConfigPodInitializer } from '../../../src/init/ConfigPodInitializer';
import type { ComponentsJsFactory } from '../../../src/pods/generate/ComponentsJsFactory';
import { TEMPLATE, TEMPLATE_VARIABLE } from '../../../src/pods/generate/variables/Variables';
import type { KeyValueStorage } from '../../../src/storage/keyvalue/KeyValueStorage';
import type { ResourceStore } from '../../../src/storage/ResourceStore';

describe('A ConfigPodInitializer', (): void => {
  let storeFactory: ComponentsJsFactory;
  let configStorage: KeyValueStorage<string, unknown>;
  let routingStorage: KeyValueStorage<string, ResourceStore>;
  let initializer: ConfigPodInitializer;
  const identifierA = { path: 'http://test.com/A' };
  const identifierB = { path: 'http://test.com/B' };
  const configA = { [TEMPLATE_VARIABLE.templateConfig]: 'templateA' };
  const configB = { [TEMPLATE_VARIABLE.templateConfig]: 'templateB' };

  beforeEach(async(): Promise<void> => {
    storeFactory = {
      generate: jest.fn().mockResolvedValue('store'),
    } as any;

    configStorage = new Map<string, unknown>() as any;
    await configStorage.set(identifierA.path, configA);
    await configStorage.set(identifierB.path, configB);

    const map = new Map();
    routingStorage = {
      get: async(key: string): Promise<ResourceStore | undefined> => map.get(key),
      set: async(key: string, value: ResourceStore): Promise<any> => map.set(key, value),
    } as any;

    initializer = new ConfigPodInitializer(storeFactory, configStorage, routingStorage);
  });

  it('generates a pod for every entry in the config storage.', async(): Promise<void> => {
    await initializer.handle();
    expect(storeFactory.generate).toHaveBeenCalledTimes(2);
    expect(storeFactory.generate).toHaveBeenCalledWith('templateA', TEMPLATE.ResourceStore, configA);
    expect(storeFactory.generate).toHaveBeenCalledWith('templateB', TEMPLATE.ResourceStore, configB);
    await expect(routingStorage.get(identifierA.path)).resolves.toBe('store');
    await expect(routingStorage.get(identifierB.path)).resolves.toBe('store');
  });
});
