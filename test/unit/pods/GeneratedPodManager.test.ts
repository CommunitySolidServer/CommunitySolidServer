import type { Resource, ResourcesGenerator } from '../../../src/pods/generate/ResourcesGenerator';
import { GeneratedPodManager } from '../../../src/pods/GeneratedPodManager';
import type { PodSettings } from '../../../src/pods/settings/PodSettings';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ConflictHttpError } from '../../../src/util/errors/ConflictHttpError';

describe('A GeneratedPodManager', (): void => {
  const base = 'http://test.com/';
  let settings: PodSettings;
  let store: jest.Mocked<ResourceStore>;
  let generatorData: Resource[];
  let resGenerator: ResourcesGenerator;
  let manager: GeneratedPodManager;

  beforeEach(async(): Promise<void> => {
    settings = {
      login: 'user',
      name: 'first last',
      webId: 'http://secure/webId',
    };
    store = {
      setRepresentation: jest.fn(),
      resourceExists: jest.fn(),
    } as any;
    generatorData = [
      { identifier: { path: '/path/' }, representation: '/' as any },
      { identifier: { path: '/path/a/' }, representation: '/a/' as any },
      { identifier: { path: '/path/a/b' }, representation: '/a/b' as any },
    ];
    resGenerator = {
      generate: jest.fn(async function* (): any {
        yield* generatorData;
      }),
    };
    manager = new GeneratedPodManager(store, resGenerator);
  });

  it('throws an error if the generate identifier is not available.', async(): Promise<void> => {
    store.resourceExists.mockResolvedValueOnce(true);
    const result = manager.createPod({ path: `${base}user/` }, settings);
    await expect(result).rejects.toThrow(`There already is a resource at ${base}user/`);
    await expect(result).rejects.toThrow(ConflictHttpError);
  });

  it('generates an identifier and writes containers before writing the resources in them.', async(): Promise<void> => {
    await expect(manager.createPod({ path: `${base}${settings.login}/` }, settings)).resolves.toBeUndefined();

    expect(store.setRepresentation).toHaveBeenCalledTimes(3);
    expect(store.setRepresentation).toHaveBeenNthCalledWith(1, { path: '/path/' }, '/');
    expect(store.setRepresentation).toHaveBeenNthCalledWith(2, { path: '/path/a/' }, '/a/');
    expect(store.setRepresentation).toHaveBeenNthCalledWith(3, { path: '/path/a/b' }, '/a/b');
  });
});
