import type { Operation } from '../../../../src/http/Operation';
import { OkResponseDescription } from '../../../../src/http/output/response/OkResponseDescription';
import { ResponseDescription } from '../../../../src/http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import type { OperationHttpHandler } from '../../../../src/server/OperationHttpHandler';
import { ConvertingOperationHttpHandler } from '../../../../src/server/util/ConvertingOperationHttpHandler';
import type {
  RepresentationConverter,
} from '../../../../src/storage/conversion/RepresentationConverter';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

describe('A ConvertingOperationHttpHandler', (): void => {
  const request: HttpRequest = {} as HttpRequest;
  const response: HttpResponse = {} as HttpResponse;
  let operation: Operation;
  const representation = new BasicRepresentation([], 'application/ld+json');
  let handlerResponse: ResponseDescription;
  const converted = new BasicRepresentation([], 'text/turtle');
  let converter: jest.Mocked<RepresentationConverter>;
  let operationHandler: jest.Mocked<OperationHttpHandler>;
  let handler: ConvertingOperationHttpHandler;

  beforeEach(async(): Promise<void> => {
    handlerResponse = new OkResponseDescription(representation.metadata, representation.data);

    operation = {
      method: 'GET',
      target: { path: 'http://example.com/foo' },
      body: new BasicRepresentation(),
      preferences: { type: { 'text/turtle': 1 }},
    };

    converter = {
      handleSafe: jest.fn().mockResolvedValue(converted),
    } as any;

    operationHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(handlerResponse),
    } as any;

    handler = new ConvertingOperationHttpHandler(converter, operationHandler);
  });

  it('can handle input if its handler can handle it.', async(): Promise<void> => {
    await expect(handler.canHandle({ request, response, operation })).resolves.toBeUndefined();

    operationHandler.canHandle.mockRejectedValueOnce(new Error('bad data'));
    await expect(handler.canHandle({ request, response, operation })).rejects.toThrow('bad data');
  });

  it('does not convert if there are no type preferences.', async(): Promise<void> => {
    delete operation.preferences.type;
    await expect(handler.handle({ request, response, operation })).resolves.toBe(handlerResponse);
    expect(converter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('does not convert if there is no output data.', async(): Promise<void> => {
    const emptyResponse = new ResponseDescription(200);
    operationHandler.handle.mockResolvedValueOnce(emptyResponse);
    await expect(handler.handle({ request, response, operation })).resolves.toBe(emptyResponse);
    expect(converter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('converts the response if requested.', async(): Promise<void> => {
    const result = await handler.handle({ request, response, operation });
    expect(result.data).toBe(converted.data);
    expect(result.metadata).toBe(converted.metadata);
    expect(result.statusCode).toBe(handlerResponse.statusCode);
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    expect(converter.handleSafe).toHaveBeenLastCalledWith({
      identifier: operation.target,
      representation,
      preferences: operation.preferences,
    });
  });

  it('errors if there is data without metadata.', async(): Promise<void> => {
    operationHandler.handle.mockResolvedValueOnce(new ResponseDescription(200, undefined, guardedStreamFrom('')));
    await expect(handler.handle({ request, response, operation })).rejects.toThrow(InternalServerError);
  });
});
