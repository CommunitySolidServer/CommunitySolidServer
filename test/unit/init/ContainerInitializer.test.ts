import { ContainerInitializer } from '../../../src/init/ContainerInitializer';
import type { Logger } from '../../../src/logging/Logger';
import { getLoggerFor } from '../../../src/logging/LogUtil';
import type { Resource, ResourcesGenerator } from '../../../src/pods/generate/ResourcesGenerator';
import type { KeyValueStorage } from '../../../src/storage/keyvalue/KeyValueStorage';
import type { ResourceStore } from '../../../src/storage/ResourceStore';

jest.mock('../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { warn: jest.fn(), debug: jest.fn(), info: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A ContainerInitializer', (): void => {
  const baseUrl = 'http://test.com/';
  const path = 'foo/';
  let store: jest.Mocked<ResourceStore>;
  let generatorData: Resource[];
  let generator: jest.Mocked<ResourcesGenerator>;
  const storageKey = 'done';
  let storage: jest.Mocked<KeyValueStorage<string, boolean>>;
  let initializer: ContainerInitializer;
  let logger: jest.Mocked<Logger>;

  beforeEach(async(): Promise<void> => {
    store = {
      setRepresentation: jest.fn(),
    } as any;

    generatorData = [
      { identifier: { path: '/.acl' }, representation: '/.acl' as any },
      { identifier: { path: '/container/' }, representation: '/container/' as any },
    ];
    generator = {
      generate: jest.fn(async function* (): any {
        yield* generatorData;
      }),
    } as any;

    const map = new Map();
    storage = {
      get: jest.fn((id: string): any => map.get(id)),
      set: jest.fn((id: string, value: any): any => map.set(id, value)),
    } as any;

    initializer = new ContainerInitializer({
      baseUrl,
      path,
      store,
      generator,
      storageKey,
      storage,
    });
    logger = getLoggerFor(initializer) as any;
    jest.clearAllMocks();
  });

  it('writes resources and sets the storage value to true.', async(): Promise<void> => {
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledTimes(2);
    expect(storage.get(storageKey)).toBe(true);
  });

  it('logs warnings if there was a problem creating a resource.', async(): Promise<void> => {
    store.setRepresentation.mockRejectedValueOnce(new Error('bad input'));

    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenLastCalledWith('Failed to create resource /.acl: bad input');
  });
});
