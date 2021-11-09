import type { Provider } from 'oidc-provider';
import type { Operation } from '../../../src/http/Operation';
import type { ErrorHandler, ErrorHandlerArgs } from '../../../src/http/output/error/ErrorHandler';
import type { ResponseDescription } from '../../../src/http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ProviderFactory } from '../../../src/identity/configuration/ProviderFactory';
import type { IdentityProviderHttpHandlerArgs } from '../../../src/identity/IdentityProviderHttpHandler';
import { IdentityProviderHttpHandler } from '../../../src/identity/IdentityProviderHttpHandler';
import type { InteractionRoute } from '../../../src/identity/interaction/routing/InteractionRoute';
import type { InteractionCompleter } from '../../../src/identity/interaction/util/InteractionCompleter';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import { getBestPreference } from '../../../src/storage/conversion/ConversionUtil';
import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../src/storage/conversion/RepresentationConverter';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { joinUrl } from '../../../src/util/PathUtil';
import { guardedStreamFrom, readableToString } from '../../../src/util/StreamUtil';
import { CONTENT_TYPE, SOLID_HTTP, SOLID_META } from '../../../src/util/Vocabularies';

describe('An IdentityProviderHttpHandler', (): void => {
  const apiVersion = '0.2';
  const baseUrl = 'http://test.com/';
  const idpPath = '/idp';
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let operation: Operation;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let routes: Record<'response' | 'complete' | 'error', jest.Mocked<InteractionRoute>>;
  let controls: Record<string, string>;
  let interactionCompleter: jest.Mocked<InteractionCompleter>;
  let converter: jest.Mocked<RepresentationConverter>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let provider: jest.Mocked<Provider>;
  let handler: IdentityProviderHttpHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: 'http://test.com/idp' },
      preferences: { type: { 'text/html': 1 }},
      body: new BasicRepresentation(),
    };

    provider = {
      interactionDetails: jest.fn(),
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    routes = {
      response: {
        getControls: jest.fn().mockReturnValue({ response: '/routeResponse' }),
        supportsPath: jest.fn((path: string): boolean => /^\/routeResponse$/u.test(path)),
        handleOperation: jest.fn().mockResolvedValue({
          type: 'response',
          details: { key: 'val' },
          templateFiles: { 'text/html': '/response' },
        }),
      },
      complete: {
        getControls: jest.fn().mockReturnValue({}),
        supportsPath: jest.fn((path: string): boolean => /^\/routeComplete$/u.test(path)),
        handleOperation: jest.fn().mockResolvedValue({
          type: 'complete',
          details: { webId: 'webId' },
          templateFiles: {},
        }),
      },
      error: {
        getControls: jest.fn().mockReturnValue({}),
        supportsPath: jest.fn((path: string): boolean => /^\/routeError$/u.test(path)),
        handleOperation: jest.fn().mockResolvedValue({
          type: 'error',
          error: new Error('test error'),
          templateFiles: { 'text/html': '/response' },
        }),
      },
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

    errorHandler = { handleSafe: jest.fn(({ error }: ErrorHandlerArgs): ResponseDescription => ({
      statusCode: 400,
      data: guardedStreamFrom(`{ "name": "${error.name}", "message": "${error.message}" }`),
    })) } as any;

    const args: IdentityProviderHttpHandlerArgs = {
      baseUrl,
      idpPath,
      providerFactory,
      interactionRoutes: Object.values(routes),
      converter,
      interactionCompleter,
      errorHandler,
    };
    handler = new IdentityProviderHttpHandler(args);
  });

  it('throws a 404 if there is no matching route.', async(): Promise<void> => {
    operation.target.path = joinUrl(baseUrl, 'invalid');
    await expect(handler.handle({ request, response, operation })).rejects.toThrow(NotFoundHttpError);
  });

  it('creates Representations for InteractionResponseResults.', async(): Promise<void> => {
    operation.target.path = joinUrl(baseUrl, '/idp/routeResponse');
    operation.method = 'POST';
    operation.body = new BasicRepresentation('value', 'text/plain');
    const result = (await handler.handle({ request, response, operation }))!;
    expect(result).toBeDefined();
    expect(routes.response.handleOperation).toHaveBeenCalledTimes(1);
    expect(routes.response.handleOperation).toHaveBeenLastCalledWith(operation, undefined);
    expect(operation.body?.metadata.contentType).toBe('application/json');

    expect(JSON.parse(await readableToString(result.data!)))
      .toEqual({ apiVersion, key: 'val', authenticating: false, controls });
    expect(result.statusCode).toBe(200);
    expect(result.metadata?.contentType).toBe('text/html');
    expect(result.metadata?.get(SOLID_META.template)?.value).toBe('/response');
  });

  it('creates Representations for InteractionErrorResults.', async(): Promise<void> => {
    operation.target.path = joinUrl(baseUrl, '/idp/routeError');
    operation.method = 'POST';
    operation.preferences = { type: { 'text/html': 1 }};

    const result = (await handler.handle({ request, response, operation }))!;
    expect(result).toBeDefined();
    expect(routes.error.handleOperation).toHaveBeenCalledTimes(1);
    expect(routes.error.handleOperation).toHaveBeenLastCalledWith(operation, undefined);

    expect(JSON.parse(await readableToString(result.data!)))
      .toEqual({ apiVersion, name: 'Error', message: 'test error', authenticating: false, controls });
    expect(result.statusCode).toBe(400);
    expect(result.metadata?.contentType).toBe('text/html');
    expect(result.metadata?.get(SOLID_META.template)?.value).toBe('/response');
  });

  it('adds a prefilled field in case error requests had a body.', async(): Promise<void> => {
    operation.target.path = joinUrl(baseUrl, '/idp/routeError');
    operation.method = 'POST';
    operation.preferences = { type: { 'text/html': 1 }};
    operation.body = new BasicRepresentation('{ "key": "val" }', 'application/json');

    const result = (await handler.handle({ request, response, operation }))!;
    expect(result).toBeDefined();
    expect(routes.error.handleOperation).toHaveBeenCalledTimes(1);
    expect(routes.error.handleOperation).toHaveBeenLastCalledWith(operation, undefined);
    expect(operation.body?.metadata.contentType).toBe('application/json');

    expect(JSON.parse(await readableToString(result.data!))).toEqual(
      { apiVersion, name: 'Error', message: 'test error', authenticating: false, controls, prefilled: { key: 'val' }},
    );
    expect(result.statusCode).toBe(400);
    expect(result.metadata?.contentType).toBe('text/html');
    expect(result.metadata?.get(SOLID_META.template)?.value).toBe('/response');
  });

  it('indicates to the templates if the request is part of an auth flow.', async(): Promise<void> => {
    operation.target.path = joinUrl(baseUrl, '/idp/routeResponse');
    operation.method = 'POST';
    const oidcInteraction = { session: { accountId: 'account' }, prompt: {}} as any;
    provider.interactionDetails.mockResolvedValueOnce(oidcInteraction);
    routes.response.handleOperation
      .mockResolvedValueOnce({ type: 'response', templateFiles: { 'text/html': '/response' }});

    const result = (await handler.handle({ request, response, operation }))!;
    expect(result).toBeDefined();
    expect(JSON.parse(await readableToString(result.data!))).toEqual({ apiVersion, authenticating: true, controls });
  });

  it('errors for InteractionCompleteResults if no oidcInteraction is defined.', async(): Promise<void> => {
    operation.target.path = joinUrl(baseUrl, '/idp/routeComplete');
    operation.method = 'POST';

    const error = expect.objectContaining({
      statusCode: 400,
      message: 'This action can only be performed as part of an OIDC authentication flow.',
      errorCode: 'E0002',
    });
    await expect(handler.handle({ request, response, operation })).rejects.toThrow(error);
    expect(routes.complete.handleOperation).toHaveBeenCalledTimes(1);
    expect(routes.complete.handleOperation).toHaveBeenLastCalledWith(operation, undefined);
    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('calls the interactionCompleter for InteractionCompleteResults and redirects.', async(): Promise<void> => {
    operation.target.path = joinUrl(baseUrl, '/idp/routeComplete');
    operation.method = 'POST';
    operation.body = new BasicRepresentation('value', 'text/plain');
    const oidcInteraction = { session: { accountId: 'account' }, prompt: {}} as any;
    provider.interactionDetails.mockResolvedValueOnce(oidcInteraction);
    const result = (await handler.handle({ request, response, operation }))!;
    expect(result).toBeDefined();
    expect(routes.complete.handleOperation).toHaveBeenCalledTimes(1);
    expect(routes.complete.handleOperation).toHaveBeenLastCalledWith(operation, oidcInteraction);
    expect(operation.body?.metadata.contentType).toBe('application/json');

    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionCompleter.handleSafe).toHaveBeenLastCalledWith({ request, webId: 'webId' });
    const location = await interactionCompleter.handleSafe.mock.results[0].value;
    expect(result.statusCode).toBe(302);
    expect(result.metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(location);
  });
});
