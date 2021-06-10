import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { JsonResourceStorage } from '../../../../src/storage/keyvalue/JsonResourceStorage';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { readableToString } from '../../../../src/util/StreamUtil';
import { LDP } from '../../../../src/util/Vocabularies';

describe('A JsonResourceStorage', (): void => {
  const baseUrl = 'http://test.com/';
  const container = '/data/';
  const identifier1 = 'http://test.com/foo';
  const identifier2 = 'http://test.com/bar';
  let store: ResourceStore;
  let storage: JsonResourceStorage;

  beforeEach(async(): Promise<void> => {
    const data: Record<string, string> = { };
    store = {
      async resourceExists(identifier: ResourceIdentifier): Promise<boolean> {
        return Boolean(data[identifier.path]);
      },
      async getRepresentation(identifier: ResourceIdentifier): Promise<Representation> {
        // Simulate container metadata
        if (identifier.path === 'http://test.com/data/' && Object.keys(data).length > 0) {
          const metadata = new RepresentationMetadata({ [LDP.contains]: Object.keys(data) });
          return new BasicRepresentation('', metadata);
        }
        if (!data[identifier.path]) {
          throw new NotFoundHttpError();
        }
        return new BasicRepresentation(data[identifier.path], identifier);
      },
      async setRepresentation(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
        data[identifier.path] = await readableToString(representation.data);
      },
      async deleteResource(identifier: ResourceIdentifier): Promise<void> {
        if (!data[identifier.path]) {
          throw new NotFoundHttpError();
        }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete data[identifier.path];
      },
    } as any;

    storage = new JsonResourceStorage(store, baseUrl, container);
  });

  it('returns undefined if there is no matching data.', async(): Promise<void> => {
    await expect(storage.get(identifier1)).resolves.toBeUndefined();
  });

  it('returns no entry data if the container does not exist yet.', async(): Promise<void> => {
    await expect(storage.entries().next()).resolves.toEqual({ done: true });
  });

  it('returns data if it was set beforehand.', async(): Promise<void> => {
    await expect(storage.set(identifier1, 'apple')).resolves.toBe(storage);
    await expect(storage.get(identifier1)).resolves.toBe('apple');
    await expect(storage.entries().next()).resolves.toEqual({ done: false, value: [ identifier1, 'apple' ]});
  });

  it('can check if data is present.', async(): Promise<void> => {
    await expect(storage.has(identifier1)).resolves.toBe(false);
    await expect(storage.set(identifier1, 'apple')).resolves.toBe(storage);
    await expect(storage.has(identifier1)).resolves.toBe(true);
  });

  it('can delete data.', async(): Promise<void> => {
    await expect(storage.has(identifier1)).resolves.toBe(false);
    await expect(storage.delete(identifier1)).resolves.toBe(false);
    await expect(storage.has(identifier1)).resolves.toBe(false);
    await expect(storage.set(identifier1, 'apple')).resolves.toBe(storage);
    await expect(storage.has(identifier1)).resolves.toBe(true);
    await expect(storage.delete(identifier1)).resolves.toBe(true);
    await expect(storage.has(identifier1)).resolves.toBe(false);
  });

  it('can handle multiple identifiers.', async(): Promise<void> => {
    await expect(storage.set(identifier1, 'apple')).resolves.toBe(storage);
    await expect(storage.has(identifier1)).resolves.toBe(true);
    await expect(storage.has(identifier2)).resolves.toBe(false);
    await expect(storage.set(identifier2, 'pear')).resolves.toBe(storage);
    await expect(storage.get(identifier1)).resolves.toBe('apple');
  });

  it('re-throws errors thrown by the store.', async(): Promise<void> => {
    store.getRepresentation = jest.fn().mockRejectedValue(new Error('bad GET'));
    await expect(storage.get(identifier1)).rejects.toThrow('bad GET');
    await expect(storage.entries().next()).rejects.toThrow('bad GET');

    store.deleteResource = jest.fn().mockRejectedValueOnce(new Error('bad DELETE'));
    await expect(storage.delete(identifier1)).rejects.toThrow('bad DELETE');
  });
});
