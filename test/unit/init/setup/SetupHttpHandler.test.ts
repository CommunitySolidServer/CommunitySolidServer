import type { RegistrationManager,
  RegistrationResponse } from '../../../../src/identity/interaction/email-password/util/RegistrationManager';
import type { Initializer } from '../../../../src/init/Initializer';
import type { SetupInput } from '../../../../src/init/setup/SetupHttpHandler';
import { SetupHttpHandler } from '../../../../src/init/setup/SetupHttpHandler';
import type { ErrorHandlerArgs, ErrorHandler } from '../../../../src/ldp/http/ErrorHandler';
import type { RequestParser } from '../../../../src/ldp/http/RequestParser';
import type { ResponseDescription } from '../../../../src/ldp/http/response/ResponseDescription';
import type { ResponseWriter } from '../../../../src/ldp/http/ResponseWriter';
import type { Operation } from '../../../../src/ldp/operations/Operation';
import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { getBestPreference } from '../../../../src/storage/conversion/ConversionUtil';
import type { RepresentationConverterArgs,
  RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { APPLICATION_JSON } from '../../../../src/util/ContentTypes';
import type { HttpError } from '../../../../src/util/errors/HttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { joinUrl } from '../../../../src/util/PathUtil';
import { guardedStreamFrom, readableToString } from '../../../../src/util/StreamUtil';
import { CONTENT_TYPE, SOLID_META } from '../../../../src/util/Vocabularies';

describe('A SetupHttpHandler', (): void => {
  const baseUrl = 'http://test.com/';
  let request: HttpRequest;
  let requestBody: SetupInput;
  const response: HttpResponse = {} as any;
  const viewTemplate = '/templates/view';
  const responseTemplate = '/templates/response';
  const storageKey = 'completed';
  let details: RegistrationResponse;
  let requestParser: jest.Mocked<RequestParser>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let registrationManager: jest.Mocked<RegistrationManager>;
  let initializer: jest.Mocked<Initializer>;
  let converter: jest.Mocked<RepresentationConverter>;
  let storage: jest.Mocked<KeyValueStorage<string, any>>;
  let handler: SetupHttpHandler;

  beforeEach(async(): Promise<void> => {
    request = { url: '/setup', method: 'GET', headers: {}} as any;
    requestBody = {};

    requestParser = {
      handleSafe: jest.fn(async(req: HttpRequest): Promise<Operation> => ({
        target: { path: joinUrl(baseUrl, req.url!) },
        method: req.method!,
        body: req.method === 'GET' ?
          undefined :
          new BasicRepresentation(JSON.stringify(requestBody), req.headers['content-type'] ?? 'text/plain'),
        preferences: { type: { 'text/html': 1 }},
      })),
    } as any;

    errorHandler = { handleSafe: jest.fn(({ error }: ErrorHandlerArgs): ResponseDescription => ({
      statusCode: 400,
      data: guardedStreamFrom(`{ "name": "${error.name}", "message": "${error.message}" }`),
    })) } as any;

    responseWriter = { handleSafe: jest.fn() } as any;

    initializer = {
      handleSafe: jest.fn(),
    } as any;

    details = {
      email: 'alice@test.email',
      createWebId: true,
      register: true,
      createPod: true,
    };

    registrationManager = {
      validateInput: jest.fn((input): any => input),
      register: jest.fn().mockResolvedValue(details),
    } as any;

    converter = {
      handleSafe: jest.fn((input: RepresentationConverterArgs): Representation => {
        // Just find the best match;
        const type = getBestPreference(input.preferences.type!, { '*/*': 1 })!;
        const metadata = new RepresentationMetadata(input.representation.metadata, { [CONTENT_TYPE]: type.value });
        return new BasicRepresentation(input.representation.data, metadata);
      }),
    } as any;

    storage = new Map<string, any>() as any;

    handler = new SetupHttpHandler({
      requestParser,
      errorHandler,
      responseWriter,
      initializer,
      registrationManager,
      converter,
      storageKey,
      storage,
      viewTemplate,
      responseTemplate,
    });
  });

  // Since all tests check similar things, the test functionality is generalized in here
  async function testPost(input: SetupInput, error?: HttpError): Promise<void> {
    request.method = 'POST';
    const initialize = Boolean(input.initialize);
    const registration = Boolean(input.registration);
    requestBody = { initialize, registration };

    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(initializer.handleSafe).toHaveBeenCalledTimes(!error && initialize ? 1 : 0);
    expect(registrationManager.validateInput).toHaveBeenCalledTimes(!error && registration ? 1 : 0);
    expect(registrationManager.register).toHaveBeenCalledTimes(!error && registration ? 1 : 0);
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const { response: mockResponse, result } = responseWriter.handleSafe.mock.calls[0][0];
    expect(mockResponse).toBe(response);
    let expectedResult: any = { initialize, registration };
    if (error) {
      expectedResult = { name: error.name, message: error.message };
    } else if (registration) {
      Object.assign(expectedResult, details);
    }
    expect(JSON.parse(await readableToString(result.data!))).toEqual(expectedResult);
    expect(result.statusCode).toBe(error?.statusCode ?? 200);
    expect(result.metadata?.contentType).toBe('text/html');
    expect(result.metadata?.get(SOLID_META.template)?.value).toBe(error ? viewTemplate : responseTemplate);

    if (!error && registration) {
      expect(registrationManager.validateInput).toHaveBeenLastCalledWith(requestBody, true);
      expect(registrationManager.register).toHaveBeenLastCalledWith(requestBody, true);
    }
  }

  it('returns the view template on GET requests.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const { response: mockResponse, result } = responseWriter.handleSafe.mock.calls[0][0];
    expect(mockResponse).toBe(response);
    expect(JSON.parse(await readableToString(result.data!))).toEqual({});
    expect(result.statusCode).toBe(200);
    expect(result.metadata?.contentType).toBe('text/html');
    expect(result.metadata?.get(SOLID_META.template)?.value).toBe(viewTemplate);

    // Setup is still enabled since this was a GET request
    expect(storage.get(storageKey)).toBeUndefined();
  });

  it('simply disables the handler if no setup is requested.', async(): Promise<void> => {
    await expect(testPost({ initialize: false, registration: false })).resolves.toBeUndefined();

    // Handler is now disabled due to successful POST
    expect(storage.get(storageKey)).toBe(true);
  });

  it('defaults to an empty body if there is none.', async(): Promise<void> => {
    requestParser.handleSafe.mockResolvedValueOnce({
      target: { path: joinUrl(baseUrl, '/randomPath') },
      method: 'POST',
      preferences: { type: { 'text/html': 1 }},
    });
    await expect(testPost({})).resolves.toBeUndefined();
  });

  it('calls the initializer when requested.', async(): Promise<void> => {
    await expect(testPost({ initialize: true, registration: false })).resolves.toBeUndefined();
  });

  it('calls the registrationManager when requested.', async(): Promise<void> => {
    await expect(testPost({ initialize: false, registration: true })).resolves.toBeUndefined();
  });

  it('converts non-HTTP errors to internal errors.', async(): Promise<void> => {
    converter.handleSafe.mockRejectedValueOnce(new Error('bad data'));
    const error = new InternalServerError('bad data');
    await expect(testPost({ initialize: true, registration: false }, error)).resolves.toBeUndefined();
  });

  it('errors on non-GET/POST requests.', async(): Promise<void> => {
    request.method = 'PUT';
    requestBody = { initialize: true, registration: true };
    const error = new MethodNotAllowedHttpError();

    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(initializer.handleSafe).toHaveBeenCalledTimes(0);
    expect(registrationManager.register).toHaveBeenCalledTimes(0);
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences: { type: { [APPLICATION_JSON]: 1 }}});
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const { response: mockResponse, result } = responseWriter.handleSafe.mock.calls[0][0];
    expect(mockResponse).toBe(response);
    expect(JSON.parse(await readableToString(result.data!))).toEqual({ name: error.name, message: error.message });
    expect(result.statusCode).toBe(405);
    expect(result.metadata?.contentType).toBe('text/html');
    expect(result.metadata?.get(SOLID_META.template)?.value).toBe(viewTemplate);

    // Setup is not disabled since there was an error
    expect(storage.get(storageKey)).toBeUndefined();
  });

  it('errors when attempting registration when no RegistrationManager is defined.', async(): Promise<void> => {
    handler = new SetupHttpHandler({
      requestParser,
      errorHandler,
      responseWriter,
      initializer,
      converter,
      storageKey,
      storage,
      viewTemplate,
      responseTemplate,
    });
    request.method = 'POST';
    requestBody = { initialize: false, registration: true };
    const error = new NotImplementedHttpError('This server is not configured to support registration during setup.');
    await expect(testPost({ initialize: false, registration: true }, error)).resolves.toBeUndefined();

    // Setup is not disabled since there was an error
    expect(storage.get(storageKey)).toBeUndefined();
  });

  it('errors when attempting initialization when no Initializer is defined.', async(): Promise<void> => {
    handler = new SetupHttpHandler({
      requestParser,
      errorHandler,
      responseWriter,
      registrationManager,
      converter,
      storageKey,
      storage,
      viewTemplate,
      responseTemplate,
    });
    request.method = 'POST';
    requestBody = { initialize: true, registration: false };
    const error = new NotImplementedHttpError('This server is not configured with a setup initializer.');
    await expect(testPost({ initialize: true, registration: false }, error)).resolves.toBeUndefined();

    // Setup is not disabled since there was an error
    expect(storage.get(storageKey)).toBeUndefined();
  });
});
