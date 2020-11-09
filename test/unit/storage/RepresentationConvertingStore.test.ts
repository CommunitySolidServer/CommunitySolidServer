import type { Representation } from '../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import type { RepresentationConverter } from '../../../src/storage/conversion/RepresentationConverter';
import { RepresentationConvertingStore } from '../../../src/storage/RepresentationConvertingStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { CONTENT_TYPE } from '../../../src/util/UriConstants';

describe('A RepresentationConvertingStore', (): void => {
  let store: RepresentationConvertingStore;
  let source: ResourceStore;
  let inConverter: RepresentationConverter;
  let outConverter: RepresentationConverter;
  const inType = 'text/turtle';
  const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
  let representation: Representation;

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => ({ data: 'data', metadata })),
      addResource: jest.fn(),
      setRepresentation: jest.fn(),
    } as any;

    inConverter = { handleSafe: jest.fn(async(): Promise<any> => 'inConvert') } as any;
    outConverter = { handleSafe: jest.fn(async(): Promise<any> => 'outConvert') } as any;

    store = new RepresentationConvertingStore(source, { inType, inConverter, outConverter });
    representation = { binary: true, data: 'data', metadata } as any;
  });

  it('returns the Representation from the source if no changes are required.', async(): Promise<void> => {
    const result = await store.getRepresentation({ path: 'path' }, { type: [
      { value: 'application/*', weight: 0 }, { value: 'text/turtle', weight: 1 },
    ]});
    expect(result).toEqual({
      data: 'data',
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual('text/turtle');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(
      { path: 'path' },
      { type: [{ value: 'application/*', weight: 0 }, { value: 'text/turtle', weight: 1 }]},
      undefined,
    );
    expect(outConverter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('returns the Representation from the source if there are no preferences.', async(): Promise<void> => {
    const result = await store.getRepresentation({ path: 'path' }, {});
    expect(result).toEqual({
      data: 'data',
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual('text/turtle');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(
      { path: 'path' }, {}, undefined,
    );
    expect(outConverter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('calls the converter if another output is preferred.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: 'path' }, { type: [
      { value: 'text/plain', weight: 1 }, { value: 'text/turtle', weight: 0 },
    ]})).resolves.toEqual('outConvert');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(outConverter.handleSafe).toHaveBeenCalledTimes(1);
    expect(outConverter.handleSafe).toHaveBeenLastCalledWith({
      identifier: { path: 'path' },
      representation: { data: 'data', metadata },
      preferences: { type: [{ value: 'text/plain', weight: 1 }, { value: 'text/turtle', weight: 0 }]},
    });
  });

  it('keeps the representation if the conversion is not required.', async(): Promise<void> => {
    const id = { path: 'identifier' };

    await expect(store.addResource(id, representation, 'conditions' as any)).resolves.toBeUndefined();
    expect(source.addResource).toHaveBeenLastCalledWith(id, representation, 'conditions');

    await expect(store.setRepresentation(id, representation, 'conditions' as any)).resolves.toBeUndefined();
    expect(inConverter.handleSafe).toHaveBeenCalledTimes(0);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(id, representation, 'conditions');

    store = new RepresentationConvertingStore(source, {});
    await expect(store.addResource(id, representation, 'conditions' as any)).resolves.toBeUndefined();
    expect(source.addResource).toHaveBeenLastCalledWith(id, representation, 'conditions');
  });

  it('converts the data if it is required.', async(): Promise<void> => {
    metadata.contentType = 'text/plain';
    const id = { path: 'identifier' };

    await expect(store.addResource(id, representation, 'conditions' as any)).resolves.toBeUndefined();
    expect(inConverter.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith(id, 'inConvert', 'conditions');

    await expect(store.setRepresentation(id, representation, 'conditions' as any)).resolves.toBeUndefined();
    expect(inConverter.handleSafe).toHaveBeenCalledTimes(2);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(id, 'inConvert', 'conditions');
  });

  it('throws an error if no content-type is provided.', async(): Promise<void> => {
    metadata.removeAll(CONTENT_TYPE);
    const id = { path: 'identifier' };

    await expect(store.addResource(id, representation, 'conditions' as any)).rejects.toThrow(InternalServerError);
  });
});
