import type { Readable } from 'node:stream';
import { GetOperationHandler } from '../../../../src/http/ldp/GetOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { Conditions } from '../../../../src/storage/conditions/Conditions';
import type { ETagHandler } from '../../../../src/storage/conditions/ETagHandler';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { NotModifiedHttpError } from '../../../../src/util/errors/NotModifiedHttpError';
import { updateModifiedDate } from '../../../../src/util/ResourceUtil';
import { CONTENT_TYPE, HH, SOLID_HTTP } from '../../../../src/util/Vocabularies';

describe('A GetOperationHandler', (): void => {
  let operation: Operation;
  let conditions: jest.Mocked<Conditions>;
  const preferences = {};
  const body = new BasicRepresentation();
  let store: ResourceStore;
  let eTagHandler: ETagHandler;
  let handler: GetOperationHandler;
  let data: Readable;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    conditions = {
      matchesMetadata: jest.fn().mockReturnValue(true),
    };

    operation = { method: 'GET', target: { path: 'http://test.com/foo' }, preferences, conditions, body };
    data = { destroy: jest.fn() } as any;
    metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    updateModifiedDate(metadata);

    store = {
      getRepresentation: jest.fn(async(): Promise<Representation> =>
        ({ binary: false, data, metadata } as any)),
    } as unknown as ResourceStore;

    eTagHandler = {
      getETag: jest.fn().mockReturnValue('ETag'),
      matchesETag: jest.fn(),
      sameResourceState: jest.fn(),
    };

    handler = new GetOperationHandler(store, eTagHandler);
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
    expect(metadata.get(HH.terms.etag)?.value).toBe('ETag');
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
    conditions.matchesMetadata.mockReturnValue(false);
    let error: unknown;
    try {
      await handler.handle({ operation });
    } catch (err: unknown) {
      error = err;
    }
    expect(NotModifiedHttpError.isInstance(error)).toBe(true);
    expect((error as NotModifiedHttpError).metadata.get(HH.terms.etag)?.value).toBe('ETag');
    expect(data.destroy).toHaveBeenCalledTimes(1);
  });
});
