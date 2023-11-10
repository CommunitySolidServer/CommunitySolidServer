import { DeleteOperationHandler } from '../../../../src/http/ldp/DeleteOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Conditions } from '../../../../src/storage/conditions/Conditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A DeleteOperationHandler', (): void => {
  let operation: Operation;
  const conditions: Conditions = { matchesMetadata: jest.fn() };
  const body = new BasicRepresentation();
  let store: jest.Mocked<ResourceStore>;
  let handler: DeleteOperationHandler;
  beforeEach(async(): Promise<void> => {
    operation = { method: 'DELETE', target: { path: 'http://test.com/foo' }, preferences: {}, conditions, body };
    store = {
      deleteResource: jest.fn(async(): Promise<any> => undefined),
    } as any satisfies ResourceStore;
    handler = new DeleteOperationHandler(store);
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
