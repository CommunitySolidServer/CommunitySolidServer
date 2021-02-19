import { createRequest, createResponse } from 'node-mocks-http';
import type { HttpHandler } from '../../../../src';
import { guardStream } from '../../../../src';
import { GetPostRouterHandler } from '../../../../src/server/util/GetPostRouterHandler';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('GetPostRouterHandler', (): void => {
  let getHandler: HttpHandler;
  let postHandler: HttpHandler;
  let getHandleFn: jest.Mock<Promise<void>, [any]>;
  let postHandleFn: jest.Mock<Promise<void>, [any]>;

  beforeEach(async(): Promise<void> => {
    getHandler = new StaticAsyncHandler<void>(true, undefined);
    postHandler = new StaticAsyncHandler<void>(true, undefined);
    getHandleFn = jest.fn(async(input: any): Promise<any> => input);
    postHandleFn = jest.fn(async(input: any): Promise<any> => input);
    getHandler.handle = getHandleFn;
    postHandler.handle = postHandleFn;
  });

  it('directs to the get handler when there is a get request.', async(): Promise<void> => {
    const handler = new GetPostRouterHandler([ '/test' ], getHandler, postHandler);
    const request = guardStream(createRequest({
      url: '/test',
      method: 'GET',
    }));
    const response = createResponse();
    await handler.handle({ request, response });
    expect(getHandleFn).toHaveBeenCalled();
    expect(postHandleFn).not.toHaveBeenCalled();
  });

  it('directs to the get handler when there is a post request.', async(): Promise<void> => {
    const handler = new GetPostRouterHandler([ '/test' ], getHandler, postHandler);
    const request = guardStream(createRequest({
      url: '/test',
      method: 'POST',
    }));
    const response = createResponse();
    await handler.handle({ request, response });
    expect(postHandleFn).toHaveBeenCalled();
    expect(getHandleFn).not.toHaveBeenCalled();
  });

  it('throws an error if the method is not post or get.', async(): Promise<void> => {
    const handler = new GetPostRouterHandler([ '/test' ], getHandler, postHandler);
    const request = guardStream(createRequest({
      url: '/test',
      method: 'DELETE',
    }));
    const response = createResponse();
    await expect(handler.handle({ request, response })).rejects.toThrow('Cannot DELETE to this route.');
  });
});
