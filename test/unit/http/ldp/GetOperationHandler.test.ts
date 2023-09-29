import type { Readable } from 'stream';
import { GetOperationHandler } from '../../../../src/http/ldp/GetOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { NotModifiedHttpError } from '../../../../src/util/errors/NotModifiedHttpError';
import { SOLID_HTTP } from '../../../../src/util/Vocabularies';

describe('A GetOperationHandler', (): void => {
  let operation: Operation;
  const conditions = new BasicConditions({});
  const preferences = {};
  const body = new BasicRepresentation();
  let store: ResourceStore;
  let handler: GetOperationHandler;
  let data: Readable;
  const metadata = new RepresentationMetadata();

  beforeEach(async(): Promise<void> => {
    operation = { method: 'GET', target: { path: 'http://test.com/foo' }, preferences, conditions, body };
    data = { destroy: jest.fn() } as any;
    store = {
      getRepresentation: jest.fn(async(): Promise<Representation> =>
        ({ binary: false, data, metadata } as any)),
    } as unknown as ResourceStore;

    handler = new GetOperationHandler(store);
  });

  it('only supports GET operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
    operation.method = 'POST';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the representation from the store with the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(result.statusCode).toBe(200);
    expect(result.metadata).toBe(metadata);
    expect(result.data).toBe(data);
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenLastCalledWith(operation.target, preferences, conditions);
  });

  it('returns 206 if the result is a partial stream.', async(): Promise<void> => {
    metadata.set(SOLID_HTTP.terms.unit, 'bytes');
    metadata.set(SOLID_HTTP.terms.start, '5');
    metadata.set(SOLID_HTTP.terms.end, '7');
    const result = await handler.handle({ operation });
    expect(result.statusCode).toBe(206);
    expect(result.metadata).toBe(metadata);
    expect(result.data).toBe(data);
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenLastCalledWith(operation.target, preferences, conditions);
  });

  it('returns a 304 if the conditions do not match.', async(): Promise<void> => {
    operation.conditions = {
      matchesMetadata: (): boolean => false,
    };
    await expect(handler.handle({ operation })).rejects.toThrow(NotModifiedHttpError);
    expect(data.destroy).toHaveBeenCalledTimes(1);
  });
});
