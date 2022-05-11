import type { BodyParser } from '../../../src/http/input/body/BodyParser';
import type { ConditionsParser } from '../../../src/http/input/conditions/ConditionsParser';
import type { TargetExtractor } from '../../../src/http/input/identifier/TargetExtractor';
import type { MetadataParser } from '../../../src/http/input/metadata/MetadataParser';
import type { PreferenceParser } from '../../../src/http/input/preferences/PreferenceParser';
import { RequestParser } from '../../../src/http/input/RequestParser';
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
import { HttpError } from '../../../src/util/errors/HttpError';

class MockedRequestParser extends RequestParser {
  public constructor(
    public readonly targetExtractor: jest.Mocked<TargetExtractor>,
    public readonly preferenceParser: jest.Mocked<PreferenceParser>,
    public readonly metadataParser: jest.Mocked<MetadataParser>,
    public readonly conditionsParser: jest.Mocked<ConditionsParser>,
    public readonly bodyParser: jest.Mocked<BodyParser>,
  ) {
    super(targetExtractor, preferenceParser, metadataParser, conditionsParser, bodyParser);
  }
}

describe('A ParsingHttpHandler', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
  const target = { path: 'http://test.com/foo' };
  const preferences = { type: { 'text/html': 1 }};
  const body = new BasicRepresentation();
  const operation: Operation = { method: 'GET', target, preferences, body };
  const errorResponse = new ResponseDescription(400);
  let requestParser: MockedRequestParser;
  let metadataCollector: jest.Mocked<OperationMetadataCollector>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let source: jest.Mocked<OperationHttpHandler>;
  let handler: ParsingHttpHandler;

  beforeEach(async(): Promise<void> => {
    request = { method: 'GET' } as any;

    const targetExtractor: jest.Mocked<TargetExtractor> = {
      handleSafe: jest.fn().mockResolvedValue(target),
    } as any;
    const preferenceParser: jest.Mocked<PreferenceParser> = {
      handleSafe: jest.fn().mockResolvedValue(preferences),
    } as any;
    const metadataParser: jest.Mocked<MetadataParser> = {
      handleSafe: jest.fn(),
    } as any;
    const conditionsParser: jest.Mocked<ConditionsParser> = {
      handleSafe: jest.fn(),
    } as any;
    const bodyParser: jest.Mocked<BodyParser> = {
      handleSafe: jest.fn().mockResolvedValue(body),
    } as any;

    requestParser = new MockedRequestParser(targetExtractor,
      preferenceParser,
      metadataParser,
      conditionsParser,
      bodyParser);
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

    expect(requestParser.targetExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(requestParser.targetExtractor.handleSafe).toHaveBeenLastCalledWith({ request });
    expect(requestParser.preferenceParser.handleSafe).toHaveBeenCalledTimes(1);
    expect(requestParser.preferenceParser.handleSafe).toHaveBeenLastCalledWith({ request });
    const { metadata } = requestParser.metadataParser.handleSafe.mock.calls[0][0];
    expect(requestParser.metadataParser.handleSafe).toHaveBeenCalledTimes(1);
    expect(requestParser.metadataParser.handleSafe).toHaveBeenLastCalledWith({ request, metadata });
    expect(requestParser.conditionsParser.handleSafe).toHaveBeenCalledTimes(1);
    expect(requestParser.conditionsParser.handleSafe).toHaveBeenLastCalledWith(request);
    expect(requestParser.bodyParser.handleSafe).toHaveBeenCalledTimes(1);
    expect(requestParser.bodyParser.handleSafe).toHaveBeenLastCalledWith({ request, metadata });
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

  it('calls the error handler if the request has no method.', async(): Promise<void> => {
    delete request.method;

    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe.mock.calls[0][0].error.name).toBe('InternalServerError');
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: errorResponse });
  });

  it('adds error metadata if able.', async(): Promise<void> => {
    const error = new HttpError(0, 'error');
    source.handleSafe.mockRejectedValueOnce(error);
    const metaResponse = new ResponseDescription(0, new RepresentationMetadata());
    errorHandler.handleSafe.mockResolvedValueOnce(metaResponse);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: metaResponse });
    expect(metaResponse.metadata?.quads()).toHaveLength(1);
  });
});
