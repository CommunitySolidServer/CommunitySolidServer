import { DeleteOperationHandler } from '../../../../src/http/ldp/DeleteOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { SimpleSuffixStrategy } from '../../../util/SimpleSuffixStrategy';

describe('A DeleteOperationHandler', (): void => {
  let operation: Operation;
  const conditions = new BasicConditions({});
  const body = new BasicRepresentation();
  const store = {} as unknown as ResourceStore;
  const metaStrategy = new SimpleSuffixStrategy('.meta');
  const handler = new DeleteOperationHandler(store, metaStrategy);
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

  it('not allowed to delete files that end with the meta suffix.', async(): Promise<void> => {
    operation.target.path = 'http://test.com/foo.meta';
    await expect(handler.handle({ operation })).rejects.toThrow(
      new ConflictHttpError('Not allowed to delete resources with the metadata extension.'),
    );
  });
});
