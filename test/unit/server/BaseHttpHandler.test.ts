import type { ErrorHandler } from '../../../src/ldp/http/ErrorHandler';
import type { RequestParser } from '../../../src/ldp/http/RequestParser';
import { ResponseDescription } from '../../../src/ldp/http/response/ResponseDescription';
import type { ResponseWriter } from '../../../src/ldp/http/ResponseWriter';
import type { Operation } from '../../../src/ldp/operations/Operation';
import type { BaseHttpHandlerArgs } from '../../../src/server/BaseHttpHandler';
import { BaseHttpHandler } from '../../../src/server/BaseHttpHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';

class DummyHttpHandler extends BaseHttpHandler {
  public constructor(args: BaseHttpHandlerArgs) {
    super(args);
  }

  public async handleOperation(): Promise<ResponseDescription | undefined> {
    return undefined;
  }
}

describe('A BaseHttpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  const preferences = { type: { 'text/html': 1 }};
  const operation: Operation = { method: 'GET', target: { path: 'http://test.com/foo' }, preferences };
  const errorResponse = new ResponseDescription(400);
  let requestParser: jest.Mocked<RequestParser>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let handler: jest.Mocked<DummyHttpHandler>;

  beforeEach(async(): Promise<void> => {
    requestParser = { handleSafe: jest.fn().mockResolvedValue(operation) } as any;
    errorHandler = { handleSafe: jest.fn().mockResolvedValue(errorResponse) } as any;
    responseWriter = { handleSafe: jest.fn() } as any;

    handler = new DummyHttpHandler({ requestParser, errorHandler, responseWriter }) as any;
    handler.handleOperation = jest.fn();
  });

  it('calls the handleOperation function with the generated operation.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(handler.handleOperation).toHaveBeenCalledTimes(1);
    expect(handler.handleOperation).toHaveBeenLastCalledWith(operation, request, response);
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('calls the responseWriter if there is a response.', async(): Promise<void> => {
    const result = new ResponseDescription(200);
    handler.handleOperation.mockResolvedValueOnce(result);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(handler.handleOperation).toHaveBeenCalledTimes(1);
    expect(handler.handleOperation).toHaveBeenLastCalledWith(operation, request, response);
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result });
  });

  it('calls the error handler if something goes wrong.', async(): Promise<void> => {
    const error = new Error('bad data');
    handler.handleOperation.mockRejectedValueOnce(error);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: errorResponse });
  });
});
