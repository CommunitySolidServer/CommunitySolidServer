import type { Operation } from '../../../../src/ldp/operations/Operation';
import { PostOperationHandler } from '../../../../src/ldp/operations/PostOperationHandler';
import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { SOLID_HTTP } from '../../../../src/util/Vocabularies';

describe('A PostOperationHandler', (): void => {
  let operation: Operation;
  let body: Representation;
  const conditions = new BasicConditions({});
  let store: ResourceStore;
  let handler: PostOperationHandler;

  beforeEach(async(): Promise<void> => {
    body = new BasicRepresentation('', 'text/turtle');
    operation = { method: 'POST', target: { path: 'http://test.com/foo' }, body, conditions, preferences: {}};
    store = {
      addResource: jest.fn(async(): Promise<ResourceIdentifier> => ({ path: 'newPath' } as ResourceIdentifier)),
    } as unknown as ResourceStore;
    handler = new PostOperationHandler(store);
  });

  it('only supports POST operations.', async(): Promise<void> => {
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

  it('adds the given representation to the store and returns the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(result.statusCode).toBe(201);
    expect(result.metadata).toBeInstanceOf(RepresentationMetadata);
    expect(result.metadata?.get(SOLID_HTTP.location)?.value).toBe('newPath');
    expect(result.data).toBeUndefined();
    expect(store.addResource).toHaveBeenCalledTimes(1);
    expect(store.addResource).toHaveBeenLastCalledWith(operation.target, body, conditions);
  });
});
