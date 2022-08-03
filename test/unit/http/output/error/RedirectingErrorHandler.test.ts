import { RedirectingErrorHandler } from '../../../../../src/http/output/error/RedirectingErrorHandler';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../../../../src/util/errors/FoundHttpError';
import { NotImplementedHttpError } from '../../../../../src/util/errors/NotImplementedHttpError';
import { SOLID_HTTP } from '../../../../../src/util/Vocabularies';

describe('A RedirectingErrorHandler', (): void => {
  const request = {} as HttpRequest;
  const handler = new RedirectingErrorHandler();

  it('only accepts redirect errors.', async(): Promise<void> => {
    const unsupportedError = new BadRequestHttpError();
    await expect(handler.canHandle({ error: unsupportedError, request })).rejects.toThrow(NotImplementedHttpError);

    const supportedError = new FoundHttpError('http://test.com/foo/bar');
    await expect(handler.canHandle({ error: supportedError, request })).resolves.toBeUndefined();
  });

  it('creates redirect responses.', async(): Promise<void> => {
    const error = new FoundHttpError('http://test.com/foo/bar');
    const result = await handler.handle({ error, request });
    expect(result.statusCode).toBe(error.statusCode);
    expect(result.metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(error.location);
  });
});
