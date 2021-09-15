import { createRequest, createResponse } from 'node-mocks-http';
import type {
  AsyncHandler,
  HttpHandlerInput,
  HttpRequest,
  HttpResponse,
  TargetExtractor,
  ResourceIdentifier,
  RouterHandlerArgs,
} from '../../../../src';
import { guardStream, joinUrl } from '../../../../src';
import { RouterHandler } from '../../../../src/server/util/RouterHandler';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('A RouterHandler', (): void => {
  const baseUrl = 'http://test.com/foo/';
  let targetExtractor: jest.Mocked<TargetExtractor>;
  let subHandler: AsyncHandler<any, any>;
  let genericRequest: HttpRequest;
  let genericResponse: HttpResponse;
  let genericInput: HttpHandlerInput;
  let args: RouterHandlerArgs;

  beforeEach((): void => {
    targetExtractor = {
      handleSafe: jest.fn(({ request: req }): ResourceIdentifier => ({ path: joinUrl(baseUrl, req.url!) })),
    } as any;

    subHandler = new StaticAsyncHandler(true, undefined);

    args = {
      baseUrl,
      targetExtractor,
      handler: subHandler,
      allowedMethods: [],
      allowedPathNames: [],
    };

    genericRequest = guardStream(createRequest({
      url: '/test',
    }));
    genericResponse = createResponse() as HttpResponse;
    genericInput = {
      request: genericRequest,
      response: genericResponse,
    };
  });

  it('calls the sub handler when handle is called.', async(): Promise<void> => {
    args.allowedMethods = [ 'GET' ];
    args.allowedPathNames = [ '/test' ];
    const handler = new RouterHandler(args);
    expect(await handler.handle(genericInput)).toBeUndefined();
  });

  it('throws an error if the request does not have a url.', async(): Promise<void> => {
    args.allowedMethods = [ 'GET' ];
    args.allowedPathNames = [ '/test' ];
    const handler = new RouterHandler(args);
    const request = guardStream(createRequest());
    await expect(handler.canHandle({
      request,
      response: genericResponse,
    })).rejects.toThrow('Cannot handle request without a url');
  });

  it('throws an error if the request does not have a method.', async(): Promise<void> => {
    args.allowedMethods = [ 'GET' ];
    args.allowedPathNames = [ '/test' ];
    const handler = new RouterHandler(args);
    const request = guardStream(createRequest({
      url: '/test',
    }));
    // @ts-expect-error manually set the method
    request.method = undefined;
    await expect(handler.canHandle({
      request,
      response: genericResponse,
    })).rejects.toThrow('Cannot handle request without a method');
  });

  it('throws an error when there are no allowed methods or pathnames.', async(): Promise<void> => {
    args.allowedMethods = [];
    args.allowedPathNames = [];
    const handler = new RouterHandler(args);
    await expect(handler.canHandle(genericInput)).rejects.toThrow('GET is not allowed.');
  });

  it('throws an error when there are no allowed methods.', async(): Promise<void> => {
    args.allowedMethods = [];
    args.allowedPathNames = [ '/test' ];
    const handler = new RouterHandler(args);
    await expect(handler.canHandle(genericInput)).rejects.toThrow('GET is not allowed.');
  });

  it('throws an error when there are no allowed pathnames.', async(): Promise<void> => {
    args.allowedMethods = [ 'GET' ];
    args.allowedPathNames = [];
    const handler = new RouterHandler(args);
    await expect(handler.canHandle(genericInput)).rejects.toThrow('Cannot handle route /test');
  });

  it('throws an error if the RegEx string is not valid Regex.', async(): Promise<void> => {
    args.allowedMethods = [ 'GET' ];
    args.allowedPathNames = [ '[' ];
    expect((): RouterHandler => new RouterHandler(args))
      .toThrow('Invalid regular expression: /[/: Unterminated character class');
  });

  it('throws an error if all else is successful, but the sub handler cannot handle.', async(): Promise<void> => {
    args.handler = new StaticAsyncHandler(false, undefined);
    args.allowedMethods = [ 'GET' ];
    args.allowedPathNames = [ '/test' ];
    const handler = new RouterHandler(args);
    await expect(handler.canHandle(genericInput)).rejects.toThrow('Not supported');
  });

  it('does not throw an error if the sub handler is successful.', async(): Promise<void> => {
    args.allowedMethods = [ 'GET' ];
    args.allowedPathNames = [ '/test' ];
    const handler = new RouterHandler(args);
    expect(await handler.canHandle(genericInput)).toBeUndefined();
  });

  it('supports * for all methods.', async(): Promise<void> => {
    args.allowedMethods = [ '*' ];
    args.allowedPathNames = [ '/test' ];
    const handler = new RouterHandler(args);
    expect(await handler.canHandle(genericInput)).toBeUndefined();
  });
});
