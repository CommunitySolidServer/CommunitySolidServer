import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../../../src/http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { RepresentationConverter } from '../../../src/storage/conversion/RepresentationConverter';
import { RepresentationConvertingStore } from '../../../src/storage/RepresentationConvertingStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { INTERNAL_QUADS } from '../../../src/util/ContentTypes';
import { CONTENT_TYPE } from '../../../src/util/Vocabularies';
import { SimpleSuffixStrategy } from '../../util/SimpleSuffixStrategy';

describe('A RepresentationConvertingStore', (): void => {
  const identifier: ResourceIdentifier = { path: 'identifier' };
  let metadata: RepresentationMetadata;
  let representation: Representation;
  const preferences: RepresentationPreferences = { type: { 'text/plain': 1, 'text/turtle': 0 }};

  let sourceRepresentation: Representation;
  let source: ResourceStore;

  const convertedIn = { in: true };
  const convertedOut = { out: true };
  let inConverter: RepresentationConverter;
  let outConverter: RepresentationConverter;

  const inPreferences: RepresentationPreferences = { type: { 'text/turtle': 1 }};
  const metadataStrategy = new SimpleSuffixStrategy('.meta');
  let store: RepresentationConvertingStore;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    representation = new BasicRepresentation('data', metadata);

    sourceRepresentation = new BasicRepresentation('data', 'text/plain');
    source = {
      getRepresentation: jest.fn().mockResolvedValue(sourceRepresentation),
      addResource: jest.fn(),
      setRepresentation: jest.fn(),
    } satisfies Partial<ResourceStore> as any;

    inConverter = {
      handleSafe: jest.fn().mockResolvedValue(convertedIn),
    } satisfies Partial<RepresentationConverter> as any;
    outConverter = {
      handleSafe: jest.fn().mockResolvedValue(convertedOut),
    } satisfies Partial<RepresentationConverter> as any;

    store = new RepresentationConvertingStore(
      source,
      metadataStrategy,
      { inPreferences, inConverter, outConverter },
    );
  });

  it('calls the outgoing converter when retrieving a representation.', async(): Promise<void> => {
    await expect(store.getRepresentation(identifier, preferences)).resolves.toEqual(convertedOut);
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(outConverter.handleSafe).toHaveBeenCalledTimes(1);
    expect(outConverter.handleSafe).toHaveBeenNthCalledWith(1, {
      identifier,
      representation: sourceRepresentation,
      preferences,
    });
  });

  it('calls the incoming converter when adding resources.', async(): Promise<void> => {
    await expect(store.addResource(identifier, representation, 'conditions' as any)).resolves.toBeUndefined();
    expect(inConverter.handleSafe).toHaveBeenCalledTimes(1);
    expect(inConverter.handleSafe).toHaveBeenNthCalledWith(1, {
      identifier,
      representation,
      preferences: { type: { 'text/turtle': 1 }},
    });
    expect(source.addResource).toHaveBeenLastCalledWith(identifier, convertedIn, 'conditions');
  });

  it('does not call the incoming converter when adding resources without type.', async(): Promise<void> => {
    representation.metadata.contentType = undefined;
    await expect(store.addResource(identifier, representation, 'conditions' as any)).resolves.toBeUndefined();
    expect(inConverter.handleSafe).toHaveBeenCalledTimes(0);
    expect(source.addResource).toHaveBeenLastCalledWith(identifier, representation, 'conditions');
  });

  it('calls the incoming converter when setting representations.', async(): Promise<void> => {
    await expect(store.setRepresentation(identifier, representation, 'conditions' as any)).resolves.toBeUndefined();
    expect(inConverter.handleSafe).toHaveBeenCalledTimes(1);
    expect(inConverter.handleSafe).toHaveBeenNthCalledWith(1, {
      identifier,
      representation,
      preferences: { type: { 'text/turtle': 1 }},
    });
    expect(source.setRepresentation).toHaveBeenLastCalledWith(identifier, convertedIn, 'conditions');
  });

  it('does not call the incoming converter when setting representations without type.', async(): Promise<void> => {
    representation.metadata.contentType = undefined;
    await expect(store.setRepresentation(identifier, representation, 'conditions' as any)).resolves.toBeUndefined();
    expect(inConverter.handleSafe).toHaveBeenCalledTimes(0);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(identifier, representation, 'conditions');
  });

  it('does not perform any conversions when constructed with empty arguments.', async(): Promise<void> => {
    const noArgStore = new RepresentationConvertingStore(source, metadataStrategy, {});
    await expect(noArgStore.getRepresentation(identifier, preferences)).resolves.toEqual(sourceRepresentation);
    await expect(noArgStore.addResource(identifier, representation)).resolves.toBeUndefined();
    await expect(noArgStore.setRepresentation(identifier, representation)).resolves.toBeUndefined();
  });

  it('converts metadata resources to internal quads.', async(): Promise<void> => {
    const resourceID = { path: 'identifier.meta' };

    await expect(store.setRepresentation(resourceID, representation)).resolves.toBeUndefined();
    expect(inConverter.handleSafe).toHaveBeenCalledTimes(1);
    expect(inConverter.handleSafe).toHaveBeenNthCalledWith(1, {
      identifier: resourceID,
      representation,
      preferences: { type: { [INTERNAL_QUADS]: 1 }},
    });
    expect(source.setRepresentation).toHaveBeenLastCalledWith(resourceID, convertedIn, undefined);
  });
});
