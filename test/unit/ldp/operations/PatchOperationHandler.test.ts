import type { Operation } from '../../../../src/ldp/operations/Operation';
import { PatchOperationHandler } from '../../../../src/ldp/operations/PatchOperationHandler';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A PatchOperationHandler', (): void => {
  const store = {} as unknown as ResourceStore;
  const handler = new PatchOperationHandler(store);
  beforeEach(async(): Promise<void> => {
    store.modifyResource = jest.fn(async(): Promise<ResourceIdentifier[]> => []);
  });

  it('only supports PATCH operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'PATCH' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('errors if there is no body or content-type.', async(): Promise<void> => {
    await expect(handler.handle({ } as Operation)).rejects.toThrow(BadRequestHttpError);
    await expect(handler.handle({ body: { metadata: new RepresentationMetadata() }} as Operation))
      .rejects.toThrow(BadRequestHttpError);
  });

  it('deletes the resource from the store and returns the correct response.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('text/turtle');
    const result = await handler.handle({ target: { path: 'url' }, body: { metadata }} as Operation);
    expect(store.modifyResource).toHaveBeenCalledTimes(1);
    expect(store.modifyResource).toHaveBeenLastCalledWith({ path: 'url' }, { metadata });
    expect(result.statusCode).toBe(205);
    expect(result.metadata).toBeUndefined();
    expect(result.data).toBeUndefined();
  });
});
