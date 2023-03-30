import type { Readable } from 'stream';
import { HeadOperationHandler } from '../../../../src/http/ldp/HeadOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { NotModifiedHttpError } from '../../../../src/util/errors/NotModifiedHttpError';

describe('A HeadOperationHandler', (): void => {
  let operation: Operation;
  const conditions = new BasicConditions({});
  const preferences = {};
  const body = new BasicRepresentation();
  let store: ResourceStore;
  let handler: HeadOperationHandler;
  let data: Readable;
  const metadata = new RepresentationMetadata();

  beforeEach(async(): Promise<void> => {
    operation = { method: 'HEAD', target: { path: 'http://test.com/foo' }, preferences, conditions, body };
    data = { destroy: jest.fn() } as any;
    store = {
      getRepresentation: jest.fn(async(): Promise<Representation> =>
        ({ binary: false, data, metadata } as any)),
    } as any;

    handler = new HeadOperationHandler(store);
  });

  it('only supports HEAD operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
    operation.method = 'GET';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
    operation.method = 'POST';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the representation from the store with the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(result.statusCode).toBe(200);
    expect(result.metadata).toBe(metadata);
    expect(result.data).toBeUndefined();
    expect(data.destroy).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenLastCalledWith(operation.target, preferences, conditions);
  });

  it('returns a 304 if the conditions do not match.', async(): Promise<void> => {
    operation.conditions = {
      matchesMetadata: (): boolean => false,
    };
    await expect(handler.handle({ operation })).rejects.toThrow(NotModifiedHttpError);
    expect(data.destroy).toHaveBeenCalledTimes(2);
  });
});
