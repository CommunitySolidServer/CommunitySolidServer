import { PutOperationHandler } from '../../../../src/http/ldp/PutOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { SOLID_HTTP } from '../../../../src/util/Vocabularies';

describe('A PutOperationHandler', (): void => {
  let operation: Operation;
  let body: Representation;
  const conditions = new BasicConditions({});
  let store: jest.Mocked<ResourceStore>;
  let handler: PutOperationHandler;
  beforeEach(async(): Promise<void> => {
    body = new BasicRepresentation('', 'text/turtle');
    operation = { method: 'PUT', target: { path: 'http://test.com/foo' }, body, conditions, preferences: {}};
    store = {
      hasResource: jest.fn(),
      setRepresentation: jest.fn(),
    } as any;

    handler = new PutOperationHandler(store);
  });

  it('only supports PUT operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
    operation.method = 'GET';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('errors if there is no content-type.', async(): Promise<void> => {
    operation.body.metadata.contentType = undefined;
    await expect(handler.handle({ operation })).rejects.toThrow(BadRequestHttpError);
  });

  it('creates the representation in the store and returns the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenLastCalledWith(operation.target, body, conditions);
    expect(result.statusCode).toBe(201);
    expect(result.metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(operation.target.path);
    expect(result.data).toBeUndefined();
  });

  it('returns the correct response if the resource already exists.', async(): Promise<void> => {
    store.hasResource.mockResolvedValueOnce(true);
    const result = await handler.handle({ operation });
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenLastCalledWith(operation.target, body, conditions);
    expect(result.statusCode).toBe(205);
    expect(result.metadata).toBeUndefined();
    expect(result.data).toBeUndefined();
  });
});
