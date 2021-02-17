import type { Readable } from 'stream';
import type { Authorization } from '../../../../src/authorization/Authorization';
import { HeadOperationHandler } from '../../../../src/ldp/operations/HeadOperationHandler';
import type { Operation } from '../../../../src/ldp/operations/Operation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A HeadOperationHandler', (): void => {
  let store: ResourceStore;
  let handler: HeadOperationHandler;
  let data: Readable;

  beforeEach(async(): Promise<void> => {
    data = { destroy: jest.fn() } as any;
    store = {
      getRepresentation: async(): Promise<Representation> =>
        ({ binary: false, data, metadata: 'metadata' } as any),
    } as any;
    handler = new HeadOperationHandler(store);
  });

  it('only supports HEAD operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'HEAD' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(NotImplementedHttpError);
    await expect(handler.canHandle({ method: 'POST' } as Operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the representation from the store with the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ target: { path: 'url' }} as Operation);
    expect(result.statusCode).toBe(200);
    expect(result.metadata).toBe('metadata');
    expect(result.data).toBeUndefined();
    expect(data.destroy).toHaveBeenCalledTimes(1);
  });

  it('adds authorization metadata in case the operation is an AuthorizedOperation.', async(): Promise<void> => {
    const authorization: Authorization = { addMetadata: jest.fn() };
    const result = await handler.handle({ target: { path: 'url' }, authorization } as Operation);
    expect(result.statusCode).toBe(200);
    expect(authorization.addMetadata).toHaveBeenCalledTimes(1);
    expect(authorization.addMetadata).toHaveBeenLastCalledWith('metadata');
  });
});
