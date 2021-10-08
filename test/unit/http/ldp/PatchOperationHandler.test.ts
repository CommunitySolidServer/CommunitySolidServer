import { PatchOperationHandler } from '../../../../src/http/ldp/PatchOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A PatchOperationHandler', (): void => {
  let operation: Operation;
  let body: Representation;
  const conditions = new BasicConditions({});
  const store = {} as unknown as ResourceStore;
  const handler = new PatchOperationHandler(store);
  beforeEach(async(): Promise<void> => {
    body = new BasicRepresentation('', 'text/turtle');
    operation = { method: 'PATCH', target: { path: 'http://test.com/foo' }, body, conditions, preferences: {}};
    store.modifyResource = jest.fn(async(): Promise<any> => undefined);
  });

  it('only supports PATCH operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
    operation.method = 'GET';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('errors if there is no body or content-type.', async(): Promise<void> => {
    operation.body!.metadata.contentType = undefined;
    await expect(handler.handle({ operation })).rejects.toThrow(BadRequestHttpError);
    delete operation.body;
    await expect(handler.handle({ operation })).rejects.toThrow(BadRequestHttpError);
  });

  it('deletes the resource from the store and returns the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(store.modifyResource).toHaveBeenCalledTimes(1);
    expect(store.modifyResource).toHaveBeenLastCalledWith(operation.target, body, conditions);
    expect(result.statusCode).toBe(205);
    expect(result.metadata).toBeUndefined();
    expect(result.data).toBeUndefined();
  });
});
