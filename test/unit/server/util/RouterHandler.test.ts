import type { HttpHandler, HttpRequest, HttpResponse, ResourceIdentifier, TargetExtractor } from '../../../../src';
import { joinUrl } from '../../../../src';
import { RouterHandler } from '../../../../src/server/util/RouterHandler';

describe('A RouterHandler', (): void => {
  const baseUrl = 'http://test.com/';
  let targetExtractor: jest.Mocked<TargetExtractor>;
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
  let handler: jest.Mocked<HttpHandler>;
  let router: RouterHandler;

  beforeEach((): void => {
    request = { method: 'GET', url: '/test' } as any;

    targetExtractor = {
      handleSafe: jest.fn(({ request: req }): ResourceIdentifier => ({ path: joinUrl(baseUrl, req.url) })),
    } as any;

    handler = {
      canHandle: jest.fn(),
      handle: jest.fn(),
    } as any;

    router = new RouterHandler({
      baseUrl,
      targetExtractor,
      handler,
      allowedMethods: [ 'GET' ],
      allowedPathNames: [ '^/test$' ],
    });
  });

  it('errors if there is no url.', async(): Promise<void> => {
    delete request.url;
    await expect(router.canHandle({ request, response }))
      .rejects.toThrow('Cannot handle request without a url');
  });

  it('passes the request method.', async(): Promise<void> => {
    await expect(router.canHandle({ request, response })).resolves.toBeUndefined();
    request.method = 'POST';
    await expect(router.canHandle({ request, response })).rejects.toThrow('POST is not allowed.');
    delete request.method;
    await expect(router.canHandle({ request, response })).rejects.toThrow('UNKNOWN is not allowed.');
  });

  it('generates a ResourceIdentifier based on the url.', async(): Promise<void> => {
    await expect(router.canHandle({ request, response })).resolves.toBeUndefined();
    request.url = '/wrongTest';
    await expect(router.canHandle({ request, response })).rejects.toThrow('Cannot handle route /wrongTest');
  });
});
