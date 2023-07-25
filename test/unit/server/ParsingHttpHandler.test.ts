import type { RequestParser } from '../../../src/http/input/RequestParser';
import type { Operation } from '../../../src/http/Operation';
import type { ErrorHandler } from '../../../src/http/output/error/ErrorHandler';
import { ResponseDescription } from '../../../src/http/output/response/ResponseDescription';
import type { ResponseWriter } from '../../../src/http/output/ResponseWriter';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import type { OperationHttpHandler } from '../../../src/server/OperationHttpHandler';
import { ParsingHttpHandler } from '../../../src/server/ParsingHttpHandler';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';

describe('A ParsingHttpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  const body = new BasicRepresentation();
  const operation: Operation = { method: 'GET', target: { path: 'http://test.com/foo' }, preferences: {}, body };
  const errorResponse = new ResponseDescription(400);
  let requestParser: jest.Mocked<RequestParser>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let source: jest.Mocked<OperationHttpHandler>;
  let handler: ParsingHttpHandler;

  beforeEach(async(): Promise<void> => {
    requestParser = { handleSafe: jest.fn().mockResolvedValue(operation) } as any;
    errorHandler = { handleSafe: jest.fn().mockResolvedValue(errorResponse) } as any;
    responseWriter = { handleSafe: jest.fn() } as any;

    source = {
      handleSafe: jest.fn(),
    } as any;

    handler = new ParsingHttpHandler(
      { requestParser, errorHandler, responseWriter, operationHandler: source },
    );
  });

  it('calls the source with the generated operation.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ operation, request, response });
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('calls the responseWriter if there is a response.', async(): Promise<void> => {
    const result = new ResponseDescription(200);
    source.handleSafe.mockResolvedValueOnce(result);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ operation, request, response });
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result });
  });

  it('calls the error handler if something goes wrong.', async(): Promise<void> => {
    const error = new BadRequestHttpError('bad data');
    source.handleSafe.mockRejectedValueOnce(error);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, request });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: errorResponse });
  });

  it('creates an InternalServerError if th error was not an HttpError.', async(): Promise<void> => {
    const error = new Error('bad data');
    source.handleSafe.mockRejectedValueOnce(error);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith(expect.objectContaining({ request }));
    expect(errorHandler.handleSafe.mock.calls[0][0].error.cause).toBe(error);
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: errorResponse });
  });
});
