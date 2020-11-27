import type { Operation } from '../../../../src/ldp/operations/Operation';
import { PatchOperationHandler } from '../../../../src/ldp/operations/PatchOperationHandler';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A PatchOperationHandler', (): void => {
  const store = {} as unknown as ResourceStore;
  const handler = new PatchOperationHandler(store);
  beforeEach(async(): Promise<void> => {
    store.modifyResource = jest.fn(async(): Promise<void> => undefined);
  });

  it('only supports PATCH operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'PATCH' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('deletes the resource from the store and returns the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ target: { path: 'url' }, body: { binary: false }} as Operation);
    expect(store.modifyResource).toHaveBeenCalledTimes(1);
    expect(store.modifyResource).toHaveBeenLastCalledWith({ path: 'url' }, { binary: false });
    expect(result.statusCode).toBe(205);
    expect(result.metadata).toBeUndefined();
    expect(result.data).toBeUndefined();
  });
});
