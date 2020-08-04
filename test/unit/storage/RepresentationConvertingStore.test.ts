import { RepresentationConverter } from '../../../src/storage/conversion/RepresentationConverter';
import { RepresentationConvertingStore } from '../../../src/storage/RepresentationConvertingStore';
import { ResourceStore } from '../../../src/storage/ResourceStore';

describe('A RepresentationConvertingStore', (): void => {
  let store: RepresentationConvertingStore;
  let source: ResourceStore;
  let handleSafeFn: jest.Mock<Promise<void>, []>;
  let converter: RepresentationConverter;

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => ({ data: 'data', metadata: { contentType: 'text/turtle' }})),
    } as unknown as ResourceStore;

    handleSafeFn = jest.fn(async(): Promise<any> => 'converter');
    converter = { handleSafe: handleSafeFn } as unknown as RepresentationConverter;

    store = new RepresentationConvertingStore(source, converter);
  });

  it('returns the Representation from the source if no changes are required.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: 'path' }, { type: [
      { value: 'text/*', weight: 0 }, { value: 'text/turtle', weight: 1 },
    ]})).resolves.toEqual({
      data: 'data',
      metadata: { contentType: 'text/turtle' },
    });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(
      { path: 'path' }, { type: [{ value: 'text/*', weight: 0 }, { value: 'text/turtle', weight: 1 }]}, undefined,
    );
    expect(handleSafeFn).toHaveBeenCalledTimes(0);
  });

  it('returns the Representation from the source if there are no preferences.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: 'path' }, {})).resolves.toEqual({
      data: 'data',
      metadata: { contentType: 'text/turtle' },
    });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(
      { path: 'path' }, {}, undefined,
    );
    expect(handleSafeFn).toHaveBeenCalledTimes(0);
  });

  it('calls the converter if another output is preferred.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: 'path' }, { type: [
      { value: 'text/plain', weight: 1 }, { value: 'text/turtle', weight: 0 },
    ]})).resolves.toEqual('converter');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(handleSafeFn).toHaveBeenCalledTimes(1);
    expect(handleSafeFn).toHaveBeenLastCalledWith({
      identifier: { path: 'path' },
      representation: { data: 'data', metadata: { contentType: 'text/turtle' }},
      preferences: { type: [{ value: 'text/plain', weight: 1 }, { value: 'text/turtle', weight: 0 }]},
    });
  });
});
