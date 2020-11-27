import type { Operation } from '../../../../src/ldp/operations/Operation';
import { PostOperationHandler } from '../../../../src/ldp/operations/PostOperationHandler';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { HTTP } from '../../../../src/util/UriConstants';

describe('A PostOperationHandler', (): void => {
  const store = {
    addResource: async(): Promise<ResourceIdentifier> => ({ path: 'newPath' } as ResourceIdentifier),
  } as unknown as ResourceStore;
  const handler = new PostOperationHandler(store);

  it('only supports POST operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'POST', body: { }} as Operation))
      .resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET', body: { }} as Operation))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('errors if there is no body.', async(): Promise<void> => {
    await expect(handler.handle({ method: 'POST' } as Operation)).rejects.toThrow(BadRequestHttpError);
  });

  it('adds the given representation to the store and returns the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ method: 'POST', body: { }} as Operation);
    expect(result.statusCode).toBe(201);
    expect(result.metadata).toBeInstanceOf(RepresentationMetadata);
    expect(result.metadata?.get(HTTP.location)?.value).toBe('newPath');
    expect(result.data).toBeUndefined();
  });
});
