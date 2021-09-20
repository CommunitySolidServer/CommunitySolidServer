import { GetOperationHandler } from '../../../../src/ldp/operations/GetOperationHandler';
import type { Operation } from '../../../../src/ldp/operations/Operation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A GetOperationHandler', (): void => {
  const conditions = new BasicConditions({});
  const preferences = {};
  let store: ResourceStore;
  let handler: GetOperationHandler;

  beforeEach(async(): Promise<void> => {
    store = {
      getRepresentation: jest.fn(async(): Promise<Representation> =>
        ({ binary: false, data: 'data', metadata: 'metadata' } as any)),
    } as unknown as ResourceStore;

    handler = new GetOperationHandler(store);
  });

  it('only supports GET operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'GET' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'POST' } as Operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the representation from the store with the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ target: { path: 'url' }, preferences, conditions } as Operation);
    expect(result.statusCode).toBe(200);
    expect(result.metadata).toBe('metadata');
    expect(result.data).toBe('data');
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenLastCalledWith({ path: 'url' }, preferences, conditions);
  });
});
