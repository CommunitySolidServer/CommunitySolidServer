import { createRequest, createResponse } from 'node-mocks-http';
import type { AsyncHandler, HttpHandlerInput, HttpRequest, HttpResponse } from '../../../../src';
import { guardStream } from '../../../../src';
import { RouterHandler } from '../../../../src/server/util/RouterHandler';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('RouterHandler', (): void => {
  let subHandler: AsyncHandler<any, any>;
  let genericRequest: HttpRequest;
  let genericResponse: HttpResponse;
  let genericInput: HttpHandlerInput;

  beforeEach((): void => {
    subHandler = new StaticAsyncHandler(true, undefined);
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
    const handler = new RouterHandler(subHandler, [ 'GET' ], [ '/test' ]);
    expect(await handler.handle(genericInput)).toBeUndefined();
  });

  it('throws an error if the request does not have a url.', async(): Promise<void> => {
    const handler = new RouterHandler(subHandler, [ 'GET' ], [ '/test' ]);
    const request = guardStream(createRequest());
    await expect(handler.canHandle({
      request,
      response: genericResponse,
    })).rejects.toThrow('Cannot handle request without a url');
  });

  it('throws an error if the request does not have a method.', async(): Promise<void> => {
    const handler = new RouterHandler(subHandler, [ 'GET' ], [ '/test' ]);
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

  it('throws an error if the request does not have a pathname.', async(): Promise<void> => {
    const handler = new RouterHandler(subHandler, [ 'GET' ], [ '/test' ]);
    const request = guardStream(createRequest({
      url: '?bad=pathname',
    }));
    await expect(handler.canHandle({
      request,
      response: genericResponse,
    })).rejects.toThrow('Cannot handle request without pathname');
  });

  it('throws an error when there are no allowed methods or pathnames.', async(): Promise<void> => {
    const handler = new RouterHandler(subHandler, [], []);
    await expect(handler.canHandle(genericInput)).rejects.toThrow('GET is not allowed.');
  });

  it('throws an error when there are no allowed methods.', async(): Promise<void> => {
    const handler = new RouterHandler(subHandler, [], [ '/test' ]);
    await expect(handler.canHandle(genericInput)).rejects.toThrow('GET is not allowed.');
  });

  it('throws an error when there are no allowed pathnames.', async(): Promise<void> => {
    const handler = new RouterHandler(subHandler, [ 'GET' ], []);
    await expect(handler.canHandle(genericInput)).rejects.toThrow('Cannot handle route /test');
  });

  it('throws an error if the RegEx string is not valid Regex.', async(): Promise<void> => {
    expect((): RouterHandler => new RouterHandler(subHandler, [ 'GET' ], [ '[' ]))
      .toThrow('Invalid regular expression: /[/: Unterminated character class');
  });

  it('throws an error if all else is successful, but the sub handler cannot handle.', async(): Promise<void> => {
    const rejectingHandler = new StaticAsyncHandler(false, undefined);
    const handler = new RouterHandler(rejectingHandler, [ 'GET' ], [ '/test' ]);
    await expect(handler.canHandle(genericInput)).rejects.toThrow('Not supported');
  });

  it('does not throw an error if the sub handler is successful.', async(): Promise<void> => {
    const handler = new RouterHandler(subHandler, [ 'GET' ], [ '/test' ]);
    expect(await handler.canHandle(genericInput)).toBeUndefined();
  });
});
