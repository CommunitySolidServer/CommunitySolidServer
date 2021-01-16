import type { Representation } from '../../../src/ldp/representation/Representation';
import type { RepresentationConverter } from '../../../src/storage/conversion/RepresentationConverter';
import { RepresentationConvertingStore } from '../../../src/storage/RepresentationConvertingStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';

describe('A RepresentationConvertingStore', (): void => {
  const identifier = { path: 'identifier' };
  const metadata = { contentType: 'text/turtle' };
  const representation: Representation = { binary: true, data: 'data', metadata } as any;
  const preferences = { type: { 'text/plain': 1, 'text/turtle': 0 }};

  const sourceRepresentation = { data: 'data' };
  const source: ResourceStore = {
    getRepresentation: jest.fn().mockResolvedValue(sourceRepresentation),
    addResource: jest.fn(),
    setRepresentation: jest.fn(),
  } as any;

  const convertedIn = { in: true };
  const convertedOut = { out: true };
  const inConverter: RepresentationConverter = { handleSafe: jest.fn().mockResolvedValue(convertedIn) } as any;
  const outConverter: RepresentationConverter = { handleSafe: jest.fn().mockResolvedValue(convertedOut) } as any;

  const inType = 'text/turtle';
  const store = new RepresentationConvertingStore(source, { inType, inConverter, outConverter });

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
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

  it('does not perform any conversions when constructed with empty arguments.', async(): Promise<void> => {
    const noArgStore = new RepresentationConvertingStore(source, {});
    await expect(noArgStore.getRepresentation(identifier, preferences)).resolves.toEqual(sourceRepresentation);
    await expect(noArgStore.addResource(identifier, representation)).resolves.toBeUndefined();
    await expect(noArgStore.setRepresentation(identifier, representation)).resolves.toBeUndefined();
  });
});
