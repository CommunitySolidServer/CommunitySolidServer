import type { Provider } from 'oidc-provider';
import type { ProviderFactory } from '../../../src/identity/configuration/ProviderFactory';
import { IdentityProviderHttpHandler } from '../../../src/identity/IdentityProviderHttpHandler';
import type { InteractionHttpHandler } from '../../../src/identity/interaction/InteractionHttpHandler';
import type { ErrorHandler } from '../../../src/ldp/http/ErrorHandler';
import type { ResponseDescription } from '../../../src/ldp/http/response/ResponseDescription';
import type { ResponseWriter } from '../../../src/ldp/http/ResponseWriter';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';

describe('An IdentityProviderHttpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let interactionHttpHandler: jest.Mocked<InteractionHttpHandler>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let provider: jest.Mocked<Provider>;
  let handler: IdentityProviderHttpHandler;

  beforeEach(async(): Promise<void> => {
    provider = {
      callback: jest.fn(),
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    interactionHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn(),
    } as any;

    errorHandler = { handleSafe: jest.fn() } as any;

    responseWriter = { handleSafe: jest.fn() } as any;

    handler = new IdentityProviderHttpHandler(
      providerFactory,
      interactionHttpHandler,
      errorHandler,
      responseWriter,
    );
  });

  it('calls the provider if there is no matching handler.', async(): Promise<void> => {
    (interactionHttpHandler.canHandle as jest.Mock).mockRejectedValueOnce(new Error('error!'));
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(1);
    expect(provider.callback).toHaveBeenLastCalledWith(request, response);
    expect(interactionHttpHandler.handle).toHaveBeenCalledTimes(0);
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(0);
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
    interactionHttpHandler.handle.mockRejectedValueOnce(error);
    errorHandler.handleSafe.mockResolvedValueOnce(errorResponse);
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
    interactionHttpHandler.handle.mockRejectedValueOnce('apple!');
    await expect(handler.handle({ request, response })).rejects.toEqual('apple!');
  });

  it('errors if there is an issue creating the provider.', async(): Promise<void> => {
    const error = new Error('error!');
    providerFactory.getProvider.mockRejectedValueOnce(error);
    await expect(handler.handle({ request, response })).rejects.toThrow(error);

    providerFactory.getProvider.mockRejectedValueOnce('apple');
    await expect(handler.handle({ request, response })).rejects.toBe('apple');
  });
});
