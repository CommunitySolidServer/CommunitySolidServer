import { Readable } from 'stream';
import streamifyArray from 'streamify-array';
import { HeadOperationHandler } from '../../../../src/ldp/operations/HeadOperationHandler';
import type { Operation } from '../../../../src/ldp/operations/Operation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A HeadOperationHandler', (): void => {
  const store = {
    getRepresentation: async(): Promise<Representation> => ({ binary: false, data: streamifyArray([ 1, 2, 3 ]) } as
      Representation),
  } as unknown as ResourceStore;
  const handler = new HeadOperationHandler(store);

  it('only supports HEAD operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'HEAD' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(UnsupportedHttpError);
    await expect(handler.canHandle({ method: 'POST' } as Operation)).rejects.toThrow(UnsupportedHttpError);
  });

  it('returns the representation from the store with the input identifier and empty data.', async(): Promise<void> => {
    await expect(handler.handle({ target: { path: 'url' }} as Operation)).resolves.toEqual(
      { identifier: { path: 'url' }, body: { binary: false, data: new Readable() }},
    );
  });
});
