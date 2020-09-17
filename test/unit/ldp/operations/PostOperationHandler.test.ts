import type { Operation } from '../../../../src/ldp/operations/Operation';
import { PostOperationHandler } from '../../../../src/ldp/operations/PostOperationHandler';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A PostOperationHandler', (): void => {
  const store = {
    addResource: async(): Promise<ResourceIdentifier> => ({ path: 'newPath' } as ResourceIdentifier),
  } as unknown as ResourceStore;
  const handler = new PostOperationHandler(store);

  it('only supports POST operations with a body.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'POST', body: { }} as Operation))
      .resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET', body: { }} as Operation))
      .rejects.toThrow(UnsupportedHttpError);
    await expect(handler.canHandle({ method: 'POST' } as Operation)).rejects.toThrow(UnsupportedHttpError);
  });

  it('adds the given representation to the store and returns the new identifier.', async(): Promise<void> => {
    await expect(handler.handle({ method: 'POST', body: { }} as Operation))
      .resolves.toEqual({ identifier: { path: 'newPath' }});
  });
});
