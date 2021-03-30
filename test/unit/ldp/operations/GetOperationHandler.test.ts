import type { Authorization } from '../../../../src/authorization/Authorization';
import { GetOperationHandler } from '../../../../src/ldp/operations/GetOperationHandler';
import type { Operation } from '../../../../src/ldp/operations/Operation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A GetOperationHandler', (): void => {
  const store = {
    getRepresentation: async(): Promise<Representation> =>
      ({ binary: false, data: 'data', metadata: 'metadata' } as any),
  } as unknown as ResourceStore;
  const handler = new GetOperationHandler(store);

  it('only supports GET operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'GET' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'POST' } as Operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the representation from the store with the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ target: { path: 'url' }} as Operation);
    expect(result.statusCode).toBe(200);
    expect(result.metadata).toBe('metadata');
    expect(result.data).toBe('data');
  });

  it('adds authorization metadata in case the operation is an AuthorizedOperation.', async(): Promise<void> => {
    const authorization: Authorization = { addMetadata: jest.fn() };
    const result = await handler.handle({ target: { path: 'url' }, authorization } as Operation);
    expect(result.statusCode).toBe(200);
    expect(authorization.addMetadata).toHaveBeenCalledTimes(1);
    expect(authorization.addMetadata).toHaveBeenLastCalledWith('metadata');
  });
});
