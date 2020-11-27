import { DeleteOperationHandler } from '../../../../src/ldp/operations/DeleteOperationHandler';
import type { Operation } from '../../../../src/ldp/operations/Operation';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A DeleteOperationHandler', (): void => {
  const store = {} as unknown as ResourceStore;
  const handler = new DeleteOperationHandler(store);
  beforeEach(async(): Promise<void> => {
    store.deleteResource = jest.fn(async(): Promise<void> => undefined);
  });

  it('only supports DELETE operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'DELETE' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('deletes the resource from the store and returns the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ target: { path: 'url' }} as Operation);
    expect(store.deleteResource).toHaveBeenCalledTimes(1);
    expect(store.deleteResource).toHaveBeenLastCalledWith({ path: 'url' });
    expect(result.statusCode).toBe(205);
    expect(result.metadata).toBeUndefined();
    expect(result.data).toBeUndefined();
  });
});
