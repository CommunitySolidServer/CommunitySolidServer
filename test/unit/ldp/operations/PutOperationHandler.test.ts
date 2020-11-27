import type { Operation } from '../../../../src/ldp/operations/Operation';
import { PutOperationHandler } from '../../../../src/ldp/operations/PutOperationHandler';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A PutOperationHandler', (): void => {
  const store = {} as unknown as ResourceStore;
  const handler = new PutOperationHandler(store);
  beforeEach(async(): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    store.setRepresentation = jest.fn(async(): Promise<void> => {});
  });

  it('only supports PUT operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(NotImplementedHttpError);
    await expect(handler.canHandle({ method: 'PUT' } as Operation)).resolves.toBeUndefined();
  });

  it('sets the representation in the store and returns the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ target: { path: 'url' }, body: {}} as Operation);
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenLastCalledWith({ path: 'url' }, {});
    expect(result.statusCode).toBe(205);
    expect(result.metadata).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  it('errors when there is no body.', async(): Promise<void> => {
    await expect(handler.handle({ method: 'PUT' } as Operation)).rejects.toThrow(BadRequestHttpError);
  });
});
