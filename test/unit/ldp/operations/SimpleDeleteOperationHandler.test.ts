import { Operation } from '../../../../src/ldp/operations/Operation';
import { SimpleDeleteOperationHandler } from '../../../../src/ldp/operations/SimpleDeleteOperationHandler';
import { ResourceStore } from '../../../../src/storage/ResourceStore';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A SimpleDeleteOperationHandler', (): void => {
  const store = {} as unknown as ResourceStore;
  const handler = new SimpleDeleteOperationHandler(store);
  beforeEach(async(): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    store.deleteResource = jest.fn(async(): Promise<void> => {});
  });

  it('only supports DELETE operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'DELETE' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(UnsupportedHttpError);
  });

  it('deletes the resource from the store and returns its identifier.', async(): Promise<void> => {
    await expect(handler.handle({ target: { path: 'url' }} as Operation))
      .resolves.toEqual({ identifier: { path: 'url' }});
    expect(store.deleteResource).toHaveBeenCalledTimes(1);
    expect(store.deleteResource).toHaveBeenLastCalledWith({ path: 'url' });
  });
});
