import { GetOperationHandler } from '../../../../src/ldp/operations/GetOperationHandler';
import { Operation } from '../../../../src/ldp/operations/Operation';
import { Representation } from '../../../../src/ldp/representation/Representation';
import { ResourceStore } from '../../../../src/storage/ResourceStore';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A GetOperationHandler', (): void => {
  const store = {
    getRepresentation: async(): Promise<Representation> => ({ binary: false } as Representation),
  } as unknown as ResourceStore;
  const handler = new GetOperationHandler(store);

  it('only supports GET operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'GET' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'POST' } as Operation)).rejects.toThrow(UnsupportedHttpError);
  });

  it('returns the representation from the store with the input identifier.', async(): Promise<void> => {
    await expect(handler.handle({ target: { path: 'url' }} as Operation)).resolves.toEqual(
      { identifier: { path: 'url' }, body: { binary: false }},
    );
  });
});
