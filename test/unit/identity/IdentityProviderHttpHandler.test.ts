import type { interactionPolicy, KoaContextWithOIDC, Provider } from 'oidc-provider';
import type { IdentityProviderFactory } from '../../../src/identity/IdentityProviderFactory';
import { IdentityProviderHttpHandler } from '../../../src/identity/IdentityProviderHttpHandler';
import type { InteractionHttpHandler } from '../../../src/identity/interaction/InteractionHttpHandler';
import type { InteractionPolicy } from '../../../src/identity/interaction/InteractionPolicy';
import type { ErrorHandler } from '../../../src/ldp/http/ErrorHandler';
import type { ResponseDescription } from '../../../src/ldp/http/response/ResponseDescription';
import type { ResponseWriter } from '../../../src/ldp/http/ResponseWriter';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';

describe('An IdentityProviderHttpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let providerFactory: IdentityProviderFactory;
  const idpPolicy: InteractionPolicy = {
    policy: [ 'prompt' as unknown as interactionPolicy.Prompt ],
    url: (ctx: KoaContextWithOIDC): string => `/idp/interaction/${ctx.oidc.uid}`,
  };
  let interactionHttpHandler: InteractionHttpHandler;
  let errorHandler: ErrorHandler;
  let responseWriter: ResponseWriter;
  let provider: Provider;
  let handler: IdentityProviderHttpHandler;

  beforeEach(async(): Promise<void> => {
    provider = {
      callback: jest.fn(),
      use: jest.fn(),
    } as any;

    providerFactory = {
      createProvider: jest.fn().mockResolvedValue(provider),
    } as any;

    interactionHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn(),
    } as any;

    errorHandler = { handleSafe: jest.fn() } as any;

    responseWriter = { handleSafe: jest.fn() } as any;

    handler = new IdentityProviderHttpHandler(
      providerFactory,
      idpPolicy,
      interactionHttpHandler,
      errorHandler,
      responseWriter,
    );
  });

  it('calls the provider if there is no matching handler.', async(): Promise<void> => {
    (interactionHttpHandler.canHandle as jest.Mock).mockRejectedValueOnce(new Error('error!'));
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(1);
    expect(provider.use).toHaveBeenCalledTimes(1);
    expect(provider.callback).toHaveBeenLastCalledWith(request, response);
    expect(interactionHttpHandler.handle).toHaveBeenCalledTimes(0);
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('should add solid_oidc_supported to the response.', async(): Promise<void> => {
    (interactionHttpHandler.canHandle as jest.Mock).mockRejectedValueOnce(new Error('error!'));
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    await (provider.use as jest.Mock).mock.calls[0][0]({ response }, jest.fn());
    expect(provider.use).toHaveBeenCalledTimes(1);
    expect((response as any).body.solid_oidc_supported).toEqual('https://solidproject.org/TR/solid-oidc');
  });

  it('calls the interaction handler if it can handle the input.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(0);
    expect(interactionHttpHandler.handle).toHaveBeenCalledTimes(1);
    expect(interactionHttpHandler.handle).toHaveBeenLastCalledWith({ request, response, provider });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('returns an error response if there was an issue with the interaction handler.', async(): Promise<void> => {
    const error = new Error('error!');
    const errorResponse: ResponseDescription = { statusCode: 500 };
    (interactionHttpHandler.handle as jest.Mock).mockRejectedValueOnce(error);
    (errorHandler.handleSafe as jest.Mock).mockResolvedValueOnce(errorResponse);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(0);
    expect(interactionHttpHandler.handle).toHaveBeenCalledTimes(1);
    expect(interactionHttpHandler.handle).toHaveBeenLastCalledWith({ request, response, provider });
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences: { type: { 'text/plain': 1 }}});
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: errorResponse });
  });

  it('re-throws the error if it is not a native Error.', async(): Promise<void> => {
    (interactionHttpHandler.handle as jest.Mock).mockRejectedValueOnce('apple!');
    await expect(handler.handle({ request, response })).rejects.toEqual('apple!');
  });

  it('caches the provider after creating it.', async(): Promise<void> => {
    expect(providerFactory.createProvider).toHaveBeenCalledTimes(0);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(providerFactory.createProvider).toHaveBeenCalledTimes(1);
    expect(providerFactory.createProvider).toHaveBeenLastCalledWith(idpPolicy);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(providerFactory.createProvider).toHaveBeenCalledTimes(1);
  });

  it('errors if there is an issue creating the provider.', async(): Promise<void> => {
    const error = new Error('error!');
    (providerFactory.createProvider as jest.Mock).mockRejectedValueOnce(error);
    await expect(handler.handle({ request, response })).rejects.toThrow(error);

    (providerFactory.createProvider as jest.Mock).mockRejectedValueOnce('apple');
    await expect(handler.handle({ request, response })).rejects.toBe('apple');
  });
});
