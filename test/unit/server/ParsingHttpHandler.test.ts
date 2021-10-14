import type { RequestParser } from '../../../src/http/input/RequestParser';
import type { OperationMetadataCollector } from '../../../src/http/ldp/metadata/OperationMetadataCollector';
import type { Operation } from '../../../src/http/Operation';
import type { ErrorHandler } from '../../../src/http/output/error/ErrorHandler';
import { OkResponseDescription } from '../../../src/http/output/response/OkResponseDescription';
import { ResponseDescription } from '../../../src/http/output/response/ResponseDescription';
import type { ResponseWriter } from '../../../src/http/output/ResponseWriter';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import type { OperationHttpHandler } from '../../../src/server/OperationHttpHandler';
import { ParsingHttpHandler } from '../../../src/server/ParsingHttpHandler';

describe('A ParsingHttpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  const preferences = { type: { 'text/html': 1 }};
  const body = new BasicRepresentation();
  const operation: Operation = { method: 'GET', target: { path: 'http://test.com/foo' }, preferences, body };
  const errorResponse = new ResponseDescription(400);
  let requestParser: jest.Mocked<RequestParser>;
  let metadataCollector: jest.Mocked<OperationMetadataCollector>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let source: jest.Mocked<OperationHttpHandler>;
  let handler: ParsingHttpHandler;

  beforeEach(async(): Promise<void> => {
    requestParser = { handleSafe: jest.fn().mockResolvedValue(operation) } as any;
    metadataCollector = { handleSafe: jest.fn() } as any;
    errorHandler = { handleSafe: jest.fn().mockResolvedValue(errorResponse) } as any;
    responseWriter = { handleSafe: jest.fn() } as any;

    source = {
      handleSafe: jest.fn(),
    } as any;

    handler = new ParsingHttpHandler(
      { requestParser, metadataCollector, errorHandler, responseWriter, operationHandler: source },
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

  it('calls the operation metadata collector if there is response metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    const okResult = new OkResponseDescription(metadata);
    source.handleSafe.mockResolvedValueOnce(okResult);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(metadataCollector.handleSafe).toHaveBeenCalledTimes(1);
    expect(metadataCollector.handleSafe).toHaveBeenLastCalledWith({ operation, metadata });
  });

  it('calls the error handler if something goes wrong.', async(): Promise<void> => {
    const error = new Error('bad data');
    source.handleSafe.mockRejectedValueOnce(error);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: errorResponse });
  });
});
