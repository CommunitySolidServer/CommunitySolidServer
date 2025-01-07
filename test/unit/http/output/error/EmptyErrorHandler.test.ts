import { EmptyErrorHandler } from '../../../../../src/http/output/error/EmptyErrorHandler';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../../src/util/errors/NotImplementedHttpError';
import { NotModifiedHttpError } from '../../../../../src/util/errors/NotModifiedHttpError';
import { SOLID_ERROR } from '../../../../../src/util/Vocabularies';

describe('An EmptyErrorHandler', (): void => {
  const request: HttpRequest = {} as any;

  it('can only handle 304 errors by default.', async(): Promise<void> => {
    const handler = new EmptyErrorHandler();
    await expect(handler.canHandle({ error: new NotModifiedHttpError(), request })).resolves.toBeUndefined();
    await expect(handler.canHandle({ error: new BadRequestHttpError(), request }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('can support other error types.', async(): Promise<void> => {
    const handler = new EmptyErrorHandler([ 400 ]);
    await expect(handler.canHandle({ error: new BadRequestHttpError(), request })).resolves.toBeUndefined();
    await expect(handler.canHandle({ error: new NotModifiedHttpError(), request }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('can support all error types.', async(): Promise<void> => {
    const handler = new EmptyErrorHandler([], true);
    await expect(handler.canHandle({ error: new BadRequestHttpError(), request })).resolves.toBeUndefined();
    await expect(handler.canHandle({ error: new NotModifiedHttpError(), request })).resolves.toBeUndefined();
  });

  it('can support specific error instances.', async(): Promise<void> => {
    const handler = new EmptyErrorHandler();
    const error = new BadRequestHttpError();
    await expect(handler.canHandle({ error, request })).rejects.toThrow(NotImplementedHttpError);
    error.metadata.add(SOLID_ERROR.terms.emptyBody, 'true');
    await expect(handler.canHandle({ error: new NotModifiedHttpError(), request })).resolves.toBeUndefined();
  });

  it('returns a ResponseDescription with an empty body.', async(): Promise<void> => {
    const handler = new EmptyErrorHandler();
    const error = new NotModifiedHttpError();
    const response = await handler.handle({ error, request });
    expect(response.statusCode).toBe(error.statusCode);
    expect(response.data).toBeUndefined();
    expect(response.metadata).toBe(error.metadata);
  });
});
