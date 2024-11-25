import type { AuxiliaryIdentifierStrategy } from '../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { CachedResourceStore } from '../../../src/storage/CachedResourceStore';
import type { ChangeMap, ResourceStore } from '../../../src/storage/ResourceStore';
import { IdentifierMap } from '../../../src/util/map/IdentifierMap';
import { readableToString } from '../../../src/util/StreamUtil';
import { flushPromises } from '../../util/Util';
import * as cacheUtil from '../../../src/util/CacheUtil';

describe('A CachedResourceStore', (): void => {
  const identifier = { path: 'https://example.com/foo' };
  const metaIdentifier = { path: 'https://example.com/foo.meta' };
  let representation: Representation;
  let source: jest.Mocked<ResourceStore>;
  let metadataStrategy: jest.Mocked<AuxiliaryIdentifierStrategy>;
  let store: CachedResourceStore;

  beforeEach(async(): Promise<void> => {
    representation = new BasicRepresentation('pear', identifier, 'text/turtle');
    source = {
      /* eslint-disable unused-imports/no-unused-vars */
      hasResource: jest.fn().mockResolvedValue(true),
      getRepresentation: jest.fn(async(...args): Promise<BasicRepresentation> =>
        new BasicRepresentation('pear', identifier, 'text/turtle')),
      addResource: jest.fn(async(id, rep): Promise<ChangeMap> =>
        new IdentifierMap([[ id, new RepresentationMetadata() ]])),
      setRepresentation: jest.fn(async(id, rep): Promise<ChangeMap> =>
        new IdentifierMap([[ id, new RepresentationMetadata() ]])),
      modifyResource: jest.fn(async(id, rep): Promise<ChangeMap> =>
        new IdentifierMap([[ id, new RepresentationMetadata() ]])),
      deleteResource: jest.fn(async(id): Promise<ChangeMap> =>
        new IdentifierMap([[ id, new RepresentationMetadata() ]])),
      /* eslint-enable unused-imports/no-unused-vars */
    };

    metadataStrategy = {
      isAuxiliaryIdentifier: jest.fn((id): boolean => id.path.endsWith('.meta')),
      getSubjectIdentifier: jest.fn((id): ResourceIdentifier => ({ path: id.path.slice(0, -'.meta'.length) })),
      getAuxiliaryIdentifier: jest.fn((id): ResourceIdentifier => ({ path: `${id.path}.meta` })),
      getAuxiliaryIdentifiers: jest.fn(),
    };

    store = new CachedResourceStore({ source, metadataStrategy });
  });

  it('returns a copy of the source representation if nothing was cached.', async(): Promise<void> => {
    // The returned stream will not be the same object as it is copied during caching
    const result = await store.getRepresentation(identifier, {});
    expect(result.metadata.contentType).toBe('text/turtle');
    await expect(readableToString(result.data)).resolves.toBe('pear');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
  });

  it('returns a cached copy on subsequent requests.', async(): Promise<void> => {
    await store.getRepresentation(identifier, {});
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);

    await flushPromises();

    // Even though we change the source response, we still get the original as it comes from the cache
    source.getRepresentation.mockResolvedValue(new BasicRepresentation('apple', identifier, 'text/plain'));
    const result = await store.getRepresentation(identifier, {});
    expect(result.metadata.contentType).toBe('text/turtle');
    await expect(readableToString(result.data)).resolves.toBe('pear');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
  });

  it('checks the source for existence if the identifier is not cached.', async(): Promise<void> => {
    await expect(store.hasResource(identifier)).resolves.toBe(true);
    expect(source.hasResource).toHaveBeenCalledTimes(1);
    expect(source.hasResource).toHaveBeenLastCalledWith(identifier);

    source.hasResource.mockResolvedValueOnce(false);
    await expect(store.hasResource(identifier)).resolves.toBe(false);
  });

  it('knows the resource exists if it is in the cache.', async(): Promise<void> => {
    await store.getRepresentation(identifier, {});

    await flushPromises();

    await expect(store.hasResource(identifier)).resolves.toBe(true);
    expect(source.hasResource).toHaveBeenCalledTimes(0);
  });

  it('can handle simultaneous get requests.', async(): Promise<void> => {
    const results = await Promise.all([
      store.getRepresentation(identifier, {}),
      store.getRepresentation(identifier, {}),
    ]);
    await expect(readableToString(results[0].data)).resolves.toBe('pear');
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);

    await flushPromises();
  });

  it('invalidates the cache when any of the other functions are successful.', async(): Promise<void> => {
    const calls = [
      async(): Promise<ChangeMap> => store.addResource(identifier, representation),
      async(): Promise<ChangeMap> => store.setRepresentation(identifier, representation),
      async(): Promise<ChangeMap> => store.modifyResource(identifier, representation),
      async(): Promise<ChangeMap> => store.deleteResource(identifier),
    ];
    for (const call of calls) {
      source.getRepresentation.mockClear();

      // Reset cache
      store = new CachedResourceStore({ source, metadataStrategy });

      // Put in cache
      await store.getRepresentation(identifier, {});
      expect(source.getRepresentation).toHaveBeenCalledTimes(1);

      const changeMap = await call();
      expect([ ...changeMap.keys() ]).toEqual([ identifier ]);

      // Should not be in cache due to call above
      await store.getRepresentation(identifier, {});
      expect(source.getRepresentation).toHaveBeenCalledTimes(2);
    }
  });

  it('invalidates metadata identifiers when changing a resource.', async(): Promise<void> => {
    await store.getRepresentation(metaIdentifier, {});
    await flushPromises();
    await store.getRepresentation(metaIdentifier, {});
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);

    await store.setRepresentation(identifier, representation);
    await flushPromises();
    await store.getRepresentation(metaIdentifier, {});
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
  });

  it('invalidates identifiers when changing their metadata.', async(): Promise<void> => {
    await store.getRepresentation(identifier, {});
    await flushPromises();
    await store.getRepresentation(identifier, {});
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);

    await store.setRepresentation(metaIdentifier, representation);
    await flushPromises();
    await store.getRepresentation(identifier, {});
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
  });

  it('can invalidate a caching that is not finished yet.', async(): Promise<void> => {
    await store.getRepresentation(identifier, {});
    await store.setRepresentation(identifier, representation);
    await flushPromises();
    await store.getRepresentation(identifier, {});
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
  });

  it('does not cache if there was an error during the caching process.', async(): Promise<void> => {
    const spy = jest.spyOn(cacheUtil, 'representationToCached');
    spy.mockRejectedValueOnce('caching failed');

    await store.getRepresentation(identifier, {});
    await flushPromises();
    await store.getRepresentation(identifier, {});
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
  });
});
