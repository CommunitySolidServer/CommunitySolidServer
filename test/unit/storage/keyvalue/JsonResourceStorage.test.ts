import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { JsonResourceStorage } from '../../../../src/storage/keyvalue/JsonResourceStorage';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { isContainerIdentifier, joinUrl } from '../../../../src/util/PathUtil';
import { readableToString } from '../../../../src/util/StreamUtil';
import { LDP } from '../../../../src/util/Vocabularies';

describe('A JsonResourceStorage', (): void => {
  const baseUrl = 'http://test.com/';
  const container = '/data/';
  const path1 = 'foo';
  const path2 = 'bar';
  const subPath = 'container/document';
  const containerIdentifier = 'http://test.com/data/';
  const subContainerIdentifier = 'http://test.com/data/container/';
  let data: Map<string, string>;

  let store: jest.Mocked<ResourceStore>;
  let storage: JsonResourceStorage<unknown>;

  beforeEach(async(): Promise<void> => {
    data = new Map<string, string>();
    store = {
      hasResource: jest.fn(async(id: ResourceIdentifier): Promise<boolean> => data.has(id.path)),
      getRepresentation: jest.fn(async(id: ResourceIdentifier): Promise<Representation> => {
        if (!data.has(id.path)) {
          throw new NotFoundHttpError();
        }
        // Simulate container metadata
        if (isContainerIdentifier(id)) {
          const keys = [ ...data.keys() ].filter((key): boolean => key.startsWith(id.path) &&
            /^[^/]+\/?$/u.test(key.slice(id.path.length)));
          const metadata = new RepresentationMetadata({ [LDP.contains]: keys });
          return new BasicRepresentation('', metadata);
        }
        return new BasicRepresentation(data.get(id.path)!, id);
      }),
      setRepresentation: jest.fn(async(id: ResourceIdentifier, representation: Representation): Promise<void> => {
        data.set(id.path, await readableToString(representation.data));
      }),
      deleteResource: jest.fn(async(identifier: ResourceIdentifier): Promise<void> => {
        if (!data.has(identifier.path)) {
          throw new NotFoundHttpError();
        }
        data.delete(identifier.path);
      }),
    } as any;

    storage = new JsonResourceStorage(store, baseUrl, container);
  });

  it('returns undefined if there is no matching data.', async(): Promise<void> => {
    await expect(storage.get(path1)).resolves.toBeUndefined();
  });

  it('returns data if it was set beforehand.', async(): Promise<void> => {
    await expect(storage.set(path1, 'apple')).resolves.toBe(storage);
    await expect(storage.get(path1)).resolves.toBe('apple');
  });

  it('can check if data is present.', async(): Promise<void> => {
    await expect(storage.has(path1)).resolves.toBe(false);
    await expect(storage.set(path1, 'apple')).resolves.toBe(storage);
    await expect(storage.has(path1)).resolves.toBe(true);
  });

  it('can delete data.', async(): Promise<void> => {
    await expect(storage.has(path1)).resolves.toBe(false);
    await expect(storage.delete(path1)).resolves.toBe(false);
    await expect(storage.has(path1)).resolves.toBe(false);
    await expect(storage.set(path1, 'apple')).resolves.toBe(storage);
    await expect(storage.has(path1)).resolves.toBe(true);
    await expect(storage.delete(path1)).resolves.toBe(true);
    await expect(storage.has(path1)).resolves.toBe(false);
  });

  it('can handle multiple paths.', async(): Promise<void> => {
    await expect(storage.set(path1, 'apple')).resolves.toBe(storage);
    await expect(storage.has(path1)).resolves.toBe(true);
    await expect(storage.has(path2)).resolves.toBe(false);
    await expect(storage.set(path2, 'pear')).resolves.toBe(storage);
    await expect(storage.get(path1)).resolves.toBe('apple');
  });

  it('re-throws errors thrown by the store.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValue(new Error('bad GET'));
    await expect(storage.get(path1)).rejects.toThrow('bad GET');
    await expect(storage.entries().next()).rejects.toThrow('bad GET');

    store.deleteResource.mockRejectedValueOnce(new Error('bad DELETE'));
    await expect(storage.delete(path1)).rejects.toThrow('bad DELETE');
  });

  it('returns no entries if no data was added.', async(): Promise<void> => {
    const entries = [];
    for await (const entry of storage.entries()) {
      entries.push(entry);
    }
    expect(entries).toHaveLength(0);
  });

  it('recursively accesses containers to find entries.', async(): Promise<void> => {
    await expect(storage.set(path1, 'path1')).resolves.toBe(storage);
    await expect(storage.set(path2, 'path2')).resolves.toBe(storage);
    await expect(storage.set(subPath, 'subDocument')).resolves.toBe(storage);

    // Need to manually insert the containers as they don't get created by the dummy store above
    data.set(containerIdentifier, '');
    data.set(subContainerIdentifier, '');

    // Manually setting invalid data which will be ignored
    data.set(joinUrl(containerIdentifier, 'badData'), 'invalid JSON');

    const entries = [];
    for await (const entry of storage.entries()) {
      entries.push(entry);
    }
    expect(entries).toEqual([
      [ path1, 'path1' ],
      [ path2, 'path2' ],
      [ subPath, 'subDocument' ],
    ]);
  });
});
