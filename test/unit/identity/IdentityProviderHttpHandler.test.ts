import type { Provider } from 'oidc-provider';
import type { ProviderFactory } from '../../../src/identity/configuration/ProviderFactory';
import type {
  IdentityProviderHttpHandlerArgs,
} from '../../../src/identity/IdentityProviderHttpHandler';
import {
  InteractionRoute,
  IdentityProviderHttpHandler,
} from '../../../src/identity/IdentityProviderHttpHandler';
import type { InteractionHandler } from '../../../src/identity/interaction/email-password/handler/InteractionHandler';
import { IdpInteractionError } from '../../../src/identity/interaction/util/IdpInteractionError';
import type { InteractionCompleter } from '../../../src/identity/interaction/util/InteractionCompleter';
import type { ErrorHandler } from '../../../src/ldp/http/ErrorHandler';
import type { RequestParser } from '../../../src/ldp/http/RequestParser';
import type { ResponseWriter } from '../../../src/ldp/http/ResponseWriter';
import type { Operation } from '../../../src/ldp/operations/Operation';
import { BasicRepresentation } from '../../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import { getBestPreference } from '../../../src/storage/conversion/ConversionUtil';
import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../src/storage/conversion/RepresentationConverter';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { joinUrl } from '../../../src/util/PathUtil';
import { readableToString } from '../../../src/util/StreamUtil';
import { CONTENT_TYPE, SOLID_HTTP, SOLID_META } from '../../../src/util/Vocabularies';

describe('An IdentityProviderHttpHandler', (): void => {
  const apiVersion = '0.2';
  const baseUrl = 'http://test.com/';
  const idpPath = '/idp';
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
  let requestParser: jest.Mocked<RequestParser>;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let routes: { response: InteractionRoute; complete: InteractionRoute };
  let controls: Record<string, string>;
  let interactionCompleter: jest.Mocked<InteractionCompleter>;
  let converter: jest.Mocked<RepresentationConverter>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let provider: jest.Mocked<Provider>;
  let handler: IdentityProviderHttpHandler;

  beforeEach(async(): Promise<void> => {
    request = { url: '/idp', method: 'GET', headers: {}} as any;

    requestParser = {
      handleSafe: jest.fn(async(req: HttpRequest): Promise<Operation> => ({
        target: { path: joinUrl(baseUrl, req.url!) },
        method: req.method!,
        body: req.method === 'GET' ?
          undefined :
          new BasicRepresentation('', req.headers['content-type'] ?? 'text/plain'),
        preferences: { type: { 'text/html': 1 }},
      })),
    } as any;

    provider = {
      callback: jest.fn(),
      interactionDetails: jest.fn(),
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    const handlers: InteractionHandler[] = [
      { handleSafe: jest.fn().mockResolvedValue({ type: 'response', details: { key: 'val' }}) } as any,
      { handleSafe: jest.fn().mockResolvedValue({ type: 'complete', details: { webId: 'webId' }}) } as any,
    ];

    routes = {
      response: new InteractionRoute('^/routeResponse$',
        { 'text/html': '/view1' },
        handlers[0],
        'login',
        { 'text/html': '/response1' },
        { response: '/routeResponse' }),
      complete: new InteractionRoute('^/routeComplete$',
        { 'text/html': '/view2' },
        handlers[1],
        'other'),
    };
    controls = { response: 'http://test.com/idp/routeResponse' };

    converter = {
      handleSafe: jest.fn((input: RepresentationConverterArgs): Representation => {
        // Just find the best match;
        const type = getBestPreference(input.preferences.type!, { '*/*': 1 })!;
        const metadata = new RepresentationMetadata(input.representation.metadata, { [CONTENT_TYPE]: type.value });
        return new BasicRepresentation(input.representation.data, metadata);
      }),
    } as any;

    interactionCompleter = { handleSafe: jest.fn().mockResolvedValue('http://test.com/idp/auth') } as any;

    errorHandler = { handleSafe: jest.fn() } as any;

    responseWriter = { handleSafe: jest.fn() } as any;

    const args: IdentityProviderHttpHandlerArgs = {
      baseUrl,
      idpPath,
      requestParser,
      providerFactory,
      interactionRoutes: Object.values(routes),
      converter,
      interactionCompleter,
      errorHandler,
      responseWriter,
    };
    handler = new IdentityProviderHttpHandler(args);
  });

  it('calls the provider if there is no matching route.', async(): Promise<void> => {
    request.url = 'invalid';
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(1);
    expect(provider.callback).toHaveBeenLastCalledWith(request, response);
  });

  it('creates default Representations for GET requests.', async(): Promise<void> => {
    request.url = '/idp/routeResponse';
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();

    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const { response: mockResponse, result } = responseWriter.handleSafe.mock.calls[0][0];
    expect(mockResponse).toBe(response);
    expect(JSON.parse(await readableToString(result.data!)))
      .toEqual({ apiVersion, authenticating: false, controls });
    expect(result.statusCode).toBe(200);
    expect(result.metadata?.contentType).toBe('text/html');
    expect(result.metadata?.get(SOLID_META.template)?.value).toBe(routes.response.viewTemplates['text/html']);
  });

  it('creates Representations for InteractionResponseResults.', async(): Promise<void> => {
    request.url = '/idp/routeResponse';
    request.method = 'POST';
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    const operation: Operation = await requestParser.handleSafe.mock.results[0].value;
    expect(routes.response.handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(routes.response.handler.handleSafe).toHaveBeenLastCalledWith({ operation });
    expect(operation.body?.metadata.contentType).toBe('application/json');

    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const { response: mockResponse, result } = responseWriter.handleSafe.mock.calls[0][0];
    expect(mockResponse).toBe(response);
    expect(JSON.parse(await readableToString(result.data!)))
      .toEqual({ apiVersion, key: 'val', authenticating: false, controls });
    expect(result.statusCode).toBe(200);
    expect(result.metadata?.contentType).toBe('text/html');
    expect(result.metadata?.get(SOLID_META.template)?.value).toBe(routes.response.responseTemplates['text/html']);
  });

  it('indicates to the templates if the request is part of an auth flow.', async(): Promise<void> => {
    request.url = '/idp/routeResponse';
    request.method = 'POST';
    const oidcInteraction = { session: { accountId: 'account' }, prompt: {}} as any;
    provider.interactionDetails.mockResolvedValueOnce(oidcInteraction);
    (routes.response.handler as jest.Mocked<InteractionHandler>).handleSafe.mockResolvedValueOnce({ type: 'response' });
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();

    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const { result } = responseWriter.handleSafe.mock.calls[0][0];
    expect(JSON.parse(await readableToString(result.data!))).toEqual({ apiVersion, authenticating: true, controls });
  });

  it('errors for InteractionCompleteResults if no oidcInteraction is defined.', async(): Promise<void> => {
    request.url = '/idp/routeComplete';
    request.method = 'POST';
    errorHandler.handleSafe.mockResolvedValueOnce({ statusCode: 400 });
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    const operation: Operation = await requestParser.handleSafe.mock.results[0].value;
    expect(routes.complete.handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(routes.complete.handler.handleSafe).toHaveBeenLastCalledWith({ operation });
    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(0);
    expect(operation.body?.metadata.contentType).toBe('application/json');

    const error = expect.objectContaining({
      message: 'This action can only be performed as part of an OIDC authentication flow.',
      errorCode: 'E0002',
    });
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences: { type: { 'text/html': 1 }}});
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: { statusCode: 400 }});
  });

  it('calls the interactionCompleter for InteractionCompleteResults and redirects.', async(): Promise<void> => {
    request.url = '/idp/routeComplete';
    request.method = 'POST';
    const oidcInteraction = { session: { accountId: 'account' }, prompt: {}} as any;
    provider.interactionDetails.mockResolvedValueOnce(oidcInteraction);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    const operation: Operation = await requestParser.handleSafe.mock.results[0].value;
    expect(routes.complete.handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(routes.complete.handler.handleSafe).toHaveBeenLastCalledWith({ operation, oidcInteraction });
    expect(operation.body?.metadata.contentType).toBe('application/json');

    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionCompleter.handleSafe).toHaveBeenLastCalledWith({ request, webId: 'webId' });
    const location = await interactionCompleter.handleSafe.mock.results[0].value;
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const args = responseWriter.handleSafe.mock.calls[0][0];
    expect(args.response).toBe(response);
    expect(args.result.statusCode).toBe(302);
    expect(args.result.metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(location);
  });

  it('matches paths based on prompt for requests to the root IDP.', async(): Promise<void> => {
    request.url = '/idp';
    request.method = 'POST';
    const oidcInteraction = { prompt: { name: 'other' }};
    provider.interactionDetails.mockResolvedValueOnce(oidcInteraction as any);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    const operation: Operation = await requestParser.handleSafe.mock.results[0].value;
    expect(routes.response.handler.handleSafe).toHaveBeenCalledTimes(0);
    expect(routes.complete.handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(routes.complete.handler.handleSafe).toHaveBeenLastCalledWith({ operation, oidcInteraction });
    expect(operation.body?.metadata.contentType).toBe('application/json');
  });

  it('displays a viewTemplate again in case of POST errors.', async(): Promise<void> => {
    request.url = '/idp/routeResponse';
    request.method = 'POST';
    (routes.response.handler.handleSafe as any)
      .mockRejectedValueOnce(new IdpInteractionError(500, 'handle error', { name: 'name' }));
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();

    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const { response: mockResponse, result } = responseWriter.handleSafe.mock.calls[0][0];
    expect(mockResponse).toBe(response);
    expect(JSON.parse(await readableToString(result.data!))).toEqual(
      { apiVersion, errorMessage: 'handle error', prefilled: { name: 'name' }, authenticating: false, controls },
    );
    expect(result.statusCode).toBe(200);
    expect(result.metadata?.contentType).toBe('text/html');
    expect(result.metadata?.get(SOLID_META.template)?.value).toBe(routes.response.viewTemplates['text/html']);
  });

  it('defaults to an empty prefilled object in case of POST errors.', async(): Promise<void> => {
    request.url = '/idp/routeResponse';
    request.method = 'POST';
    (routes.response.handler.handleSafe as any).mockRejectedValueOnce(new Error('handle error'));
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();

    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const { response: mockResponse, result } = responseWriter.handleSafe.mock.calls[0][0];
    expect(mockResponse).toBe(response);
    expect(JSON.parse(await readableToString(result.data!)))
      .toEqual({ apiVersion, errorMessage: 'handle error', authenticating: false, controls });
  });

  it('calls the errorHandler if there is a problem resolving the request.', async(): Promise<void> => {
    request.url = '/idp/routeResponse';
    request.method = 'GET';
    const error = new Error('bad template');
    converter.handleSafe.mockRejectedValueOnce(error);
    errorHandler.handleSafe.mockResolvedValueOnce({ statusCode: 500 });
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences: { type: { 'text/html': 1 }}});
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: { statusCode: 500 }});
  });

  it('can only resolve GET/POST requests.', async(): Promise<void> => {
    request.url = '/idp/routeResponse';
    request.method = 'DELETE';
    const error = new BadRequestHttpError('Unsupported request: DELETE http://test.com/idp/routeResponse');
    errorHandler.handleSafe.mockResolvedValueOnce({ statusCode: 500 });
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences: { type: { 'text/html': 1 }}});
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: { statusCode: 500 }});
  });
});
