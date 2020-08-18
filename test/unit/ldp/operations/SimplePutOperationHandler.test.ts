import { Operation } from '../../../../src/ldp/operations/Operation';
import { ResourceStore } from '../../../../src/storage/ResourceStore';
import { SimplePutOperationHandler } from '../../../../src/ldp/operations/SimplePutOperationHandler';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A SimplePutOperationHandler', (): void => {
  const store = {} as unknown as ResourceStore;
  const handler = new SimplePutOperationHandler(store);
  beforeEach(async(): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    store.setRepresentation = jest.fn(async(): Promise<void> => {});
  });

  it('only supports PUT operations with a body.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'PUT' } as Operation)).rejects.toThrow(UnsupportedHttpError);
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(UnsupportedHttpError);
    await expect(handler.canHandle({ method: 'PUT', body: { dataType: 'test' }} as Operation)).resolves.toBeUndefined();
  });

  it('sets the representation in the store and returns its identifier.', async(): Promise<void> => {
    await expect(handler.handle({ target: { path: 'url' }, body: { dataType: 'test' }} as Operation))
      .resolves.toEqual({ identifier: { path: 'url' }});
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenLastCalledWith({ path: 'url' }, { dataType: 'test' });
  });
});
