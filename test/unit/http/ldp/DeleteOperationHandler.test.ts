import { DeleteOperationHandler } from '../../../../src/http/ldp/DeleteOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A DeleteOperationHandler', (): void => {
  let operation: Operation;
  const conditions = new BasicConditions({});
  const body = new BasicRepresentation();
  const store = {} as unknown as ResourceStore;
  const handler = new DeleteOperationHandler(store);
  beforeEach(async(): Promise<void> => {
    operation = { method: 'DELETE', target: { path: 'http://test.com/foo' }, preferences: {}, conditions, body };
    store.deleteResource = jest.fn(async(): Promise<any> => undefined);
  });

  it('only supports DELETE operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
    operation.method = 'GET';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('deletes the resource from the store and returns the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(store.deleteResource).toHaveBeenCalledTimes(1);
    expect(store.deleteResource).toHaveBeenLastCalledWith(operation.target, conditions);
    expect(result.statusCode).toBe(205);
    expect(result.metadata).toBeUndefined();
    expect(result.data).toBeUndefined();
  });
});
