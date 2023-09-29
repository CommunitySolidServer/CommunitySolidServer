import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import { BinarySliceResourceStore } from '../../../src/storage/BinarySliceResourceStore';
import { ResourceStore } from '../../../src/storage/ResourceStore';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { RangeNotSatisfiedHttpError } from '../../../src/util/errors/RangeNotSatisfiedHttpError';
import { readableToString } from '../../../src/util/StreamUtil';
import { SOLID_HTTP } from '../../../src/util/Vocabularies';

describe('A BinarySliceResourceStore', (): void => {
  const identifier = { path: 'path' };
  let representation: Representation;
  let source: jest.Mocked<ResourceStore>;
  let store: BinarySliceResourceStore;

  beforeEach(async(): Promise<void> => {
    representation = new BasicRepresentation('0123456789', 'text/plain');

    source = {
      getRepresentation: jest.fn().mockResolvedValue(representation),
    } satisfies Partial<ResourceStore> as any;

    store = new BinarySliceResourceStore(source);
  });

  it('slices the data stream and stores the metadata.', async(): Promise<void> => {
    const result = await store.getRepresentation(identifier, { range: { unit: 'bytes', parts: [{ start: 1, end: 4 }]}});
    await expect(readableToString(result.data)).resolves.toBe('1234');
    expect(result.metadata.get(SOLID_HTTP.terms.unit)?.value).toBe('bytes');
    expect(result.metadata.get(SOLID_HTTP.terms.start)?.value).toBe('1');
    expect(result.metadata.get(SOLID_HTTP.terms.end)?.value).toBe('4');
  });

  it('does not add end metadata if there is none.', async(): Promise<void> => {
    const result = await store.getRepresentation(identifier, { range: { unit: 'bytes', parts: [{ start: 5 }]}});
    await expect(readableToString(result.data)).resolves.toBe('56789');
    expect(result.metadata.get(SOLID_HTTP.terms.unit)?.value).toBe('bytes');
    expect(result.metadata.get(SOLID_HTTP.terms.start)?.value).toBe('5');
    expect(result.metadata.get(SOLID_HTTP.terms.end)).toBeUndefined();
  });

  it('returns the original data if there is no valid range request.', async(): Promise<void> => {
    let result = await store.getRepresentation(identifier, {});
    await expect(readableToString(result.data)).resolves.toBe('0123456789');

    source.getRepresentation.mockResolvedValue(new BasicRepresentation('0123456789', 'text/plain'));
    result = await store.getRepresentation(identifier, { range: { unit: 'triples', parts: []}});
    await expect(readableToString(result.data)).resolves.toBe('0123456789');

    source.getRepresentation.mockResolvedValue(new BasicRepresentation('0123456789', 'text/plain'));
    result = await store.getRepresentation(identifier, { range: { unit: 'bytes', parts: []}});
    await expect(readableToString(result.data)).resolves.toBe('0123456789');
  });

  it('returns the original data if there already is slice metadata.', async(): Promise<void> => {
    representation.metadata.set(SOLID_HTTP.terms.unit, 'triples');

    const result = await store.getRepresentation(identifier, { range: { unit: 'bytes', parts: [{ start: 5 }]}});
    await expect(readableToString(result.data)).resolves.toBe('0123456789');
  });

  it('only supports binary streams.', async(): Promise<void> => {
    representation.binary = false;
    await expect(store.getRepresentation(identifier, { range: { unit: 'bytes', parts: [{ start: 5 }]}}))
      .rejects.toThrow(InternalServerError);
  });

  it('does not support multipart ranges.', async(): Promise<void> => {
    await expect(store.getRepresentation(identifier,
      { range: { unit: 'bytes', parts: [{ start: 5, end: 6 }, { start: 7, end: 8 }]}}))
      .rejects.toThrow(RangeNotSatisfiedHttpError);
  });

  it('closes the source stream if there was an error creating the SliceStream.', async(): Promise<void> => {
    representation.data.destroy = jest.fn();
    await expect(store.getRepresentation(identifier, { range: { unit: 'bytes', parts: [{ start: -5 }]}}))
      .rejects.toThrow(RangeNotSatisfiedHttpError);
    expect(representation.data.destroy).toHaveBeenCalledTimes(1);
  });
});
