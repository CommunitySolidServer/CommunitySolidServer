import { GetOperationHandler } from '../../../../src/http/ldp/GetOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A GetOperationHandler', (): void => {
  let operation: Operation;
  const conditions = new BasicConditions({});
  const preferences = {};
  const body = new BasicRepresentation();
  let store: ResourceStore;
  let handler: GetOperationHandler;

  beforeEach(async(): Promise<void> => {
    operation = { method: 'GET', target: { path: 'http://test.com/foo' }, preferences, conditions, body };
    store = {
      getRepresentation: jest.fn(async(): Promise<Representation> =>
        ({ binary: false, data: 'data', metadata: 'metadata' } as any)),
    } as unknown as ResourceStore;

    handler = new GetOperationHandler(store);
  });

  it('only supports GET operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
    operation.method = 'POST';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the representation from the store with the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(result.statusCode).toBe(200);
    expect(result.metadata).toBe('metadata');
    expect(result.data).toBe('data');
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenLastCalledWith(operation.target, preferences, conditions);
  });
});
