import type { ResponseWriter } from '../../../../src/ldp/http/ResponseWriter';
import type { TargetExtractor } from '../../../../src/ldp/http/TargetExtractor';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { RedirectAllHttpHandler } from '../../../../src/server/util/RedirectAllHttpHandler';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { joinUrl } from '../../../../src/util/PathUtil';
import { SOLID_HTTP } from '../../../../src/util/Vocabularies';

describe('A RedirectAllHttpHandler', (): void => {
  const baseUrl = 'http://test.com/';
  const target = '/foo';
  const absoluteTarget = 'http://test.com/foo';
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
  let targetExtractor: jest.Mocked<TargetExtractor>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let handler: RedirectAllHttpHandler;

  beforeEach(async(): Promise<void> => {
    request = { url: '/foo' } as any;

    targetExtractor = {
      handleSafe: jest.fn(({ request: req }): ResourceIdentifier => ({ path: joinUrl(baseUrl, req.url!) })),
    } as any;

    responseWriter = { handleSafe: jest.fn() } as any;

    handler = new RedirectAllHttpHandler({ baseUrl, target, targetExtractor, responseWriter });
  });

  it('rejects requests for the target.', async(): Promise<void> => {
    request.url = target;
    await expect(handler.canHandle({ request, response })).rejects.toThrow(NotImplementedHttpError);
  });

  it('accepts all other requests.', async(): Promise<void> => {
    request.url = '/otherPath';
    await expect(handler.canHandle({ request, response })).resolves.toBeUndefined();
  });

  it('writes out a redirect response.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({
      response,
      result: expect.objectContaining({ statusCode: 302 }),
    });
    const { metadata } = responseWriter.handleSafe.mock.calls[0][0].result;
    expect(metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(absoluteTarget);
  });
});
