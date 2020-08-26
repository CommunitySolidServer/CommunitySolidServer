import { Operation } from '../../../../src/ldp/operations/Operation';
import { SimplePostOperationHandler } from '../../../../src/ldp/operations/SimplePostOperationHandler';
import { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { ResourceStore } from '../../../../src/storage/ResourceStore';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A SimplePostOperationHandler', (): void => {
  const store = {
    addResource: async(): Promise<ResourceIdentifier> => ({ path: 'newPath' } as ResourceIdentifier),
  } as unknown as ResourceStore;
  const handler = new SimplePostOperationHandler(store);

  it('only supports POST operations with a body.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'POST', body: { dataType: 'test' }} as Operation))
      .resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET', body: { dataType: 'test' }} as Operation))
      .rejects.toThrow(UnsupportedHttpError);
    await expect(handler.canHandle({ method: 'POST' } as Operation)).rejects.toThrow(UnsupportedHttpError);
  });

  it('adds the given representation to the store and returns the new identifier.', async(): Promise<void> => {
    await expect(handler.handle({ method: 'POST', body: { dataType: 'test' }} as Operation))
      .resolves.toEqual({ identifier: { path: 'newPath' }});
  });
});
