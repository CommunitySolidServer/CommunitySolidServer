import type { TargetExtractor } from '../../../../src/http/input/identifier/TargetExtractor';
import type { ResponseWriter } from '../../../../src/http/output/ResponseWriter';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { RedirectingHttpHandler } from '../../../../src/server/util/RedirectingHttpHandler';
import { joinUrl } from '../../../../src/util/PathUtil';
import { SOLID_HTTP } from '../../../../src/util/Vocabularies';

describe('A RedirectingHttpHandler', (): void => {
  const baseUrl = 'http://test.com/';
  const request = { method: 'GET' } as HttpRequest;
  const response = {} as HttpResponse;
  let targetExtractor: jest.Mocked<TargetExtractor>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let handler: RedirectingHttpHandler;

  beforeEach(async(): Promise<void> => {
    targetExtractor = {
      handleSafe: jest.fn(({ request: req }): ResourceIdentifier => ({ path: joinUrl(baseUrl, req.url) })),
    } as any;

    responseWriter = { handleSafe: jest.fn() } as any;

    handler = new RedirectingHttpHandler({
      '/one': '/two',
      '/from/(.*)': 'http://to/t$1',
      '/f([aeiou]+)/b([aeiou]+)r': '/f$2/b$1r',
      '/s(.)me': '/s$1me',
    }, baseUrl, targetExtractor, responseWriter);
  });

  afterEach(jest.clearAllMocks);

  it('does not handle requests without URL.', async(): Promise<void> => {
    await expect(handler.canHandle({ request, response }))
      .rejects.toThrow('Url must be a string. Received undefined');
    await expect(handler.handle({ request, response }))
      .rejects.toThrow('Url must be a string. Received undefined');
  });

  it('does not handle requests with unconfigured URLs.', async(): Promise<void> => {
    request.url = '/other';
    await expect(handler.canHandle({ request, response }))
      .rejects.toThrow('No redirect configured for /other');
    await expect(handler.handle({ request, response }))
      .rejects.toThrow('No redirect configured for /other');
  });

  it('does not handle requests redirecting to their own target URL.', async(): Promise<void> => {
    request.url = '/same';
    await expect(handler.canHandle({ request, response }))
      .rejects.toThrow('Target is already correct.');
    await expect(handler.handle({ request, response }))
      .rejects.toThrow('Target is already correct.');
  });

  it('handles requests to a known URL.', async(): Promise<void> => {
    request.url = '/one';

    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({
      response,
      result: expect.objectContaining({ statusCode: 308 }),
    });
    const { metadata } = responseWriter.handleSafe.mock.calls[0][0].result;
    expect(metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(joinUrl(baseUrl, '/two'));
  });

  it('handles correctly substitutes group patterns.', async(): Promise<void> => {
    request.url = '/fa/boor';

    await handler.handle({ request, response });
    const { metadata } = responseWriter.handleSafe.mock.calls[0][0].result;
    expect(metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(joinUrl(baseUrl, '/foo/bar'));
  });

  it('redirects to an absolute url if provided.', async(): Promise<void> => {
    request.url = '/from/here';

    await handler.handle({ request, response });
    const { metadata } = responseWriter.handleSafe.mock.calls[0][0].result;
    expect(metadata?.get(SOLID_HTTP.terms.location)?.value).toBe('http://to/there');
  });

  it.each([ 301, 302, 303, 307, 308 ])('redirects with the provided status code: %i.', async(code): Promise<void> => {
    request.url = '/one';
    (handler as any).statusCode = code;

    await handler.handle({ request, response });
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({
      response,
      result: expect.objectContaining({ statusCode: code }),
    });
  });
});
