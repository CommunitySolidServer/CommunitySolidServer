import type { Provider } from 'oidc-provider';
import type { IdentityProviderFactory } from '../../../src/identity/IdentityProviderFactory';
import { IdentityProviderHttpHandler } from '../../../src/identity/IdentityProviderHttpHandler';
import type { IdpInteractionHttpHandler } from '../../../src/identity/interaction/IdpInteractionHttpHandler';
import type { IdpInteractionPolicy } from '../../../src/identity/interaction/IdpInteractionPolicy';
import type { ResponseWriter } from '../../../src/ldp/http/ResponseWriter';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';

describe('An IdentityProviderHttpHandler', (): void => {
  const request: HttpRequest = 'request!' as any;
  const response: HttpResponse = 'response!' as any;
  let providerFactory: IdentityProviderFactory;
  const interactionPolicy: IdpInteractionPolicy = 'interactionPolicy!' as any;
  let interactionHttpHandler: IdpInteractionHttpHandler;
  let errorResponseWriter: ResponseWriter;
  let provider: Provider;
  let handler: IdentityProviderHttpHandler;

  beforeEach(async(): Promise<void> => {
    provider = {
      callback: jest.fn(),
    } as any;

    providerFactory = {
      createProvider: jest.fn().mockResolvedValue(provider),
    } as any;

    interactionHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn(),
    } as any;

    errorResponseWriter = {
      handleSafe: jest.fn(),
    } as any;

    handler = new IdentityProviderHttpHandler(
      providerFactory,
      interactionPolicy,
      interactionHttpHandler,
      errorResponseWriter,
    );
  });

  it('calls the provider if there is no matching handler.', async(): Promise<void> => {
    (interactionHttpHandler.canHandle as jest.Mock).mockRejectedValueOnce(new Error('error!'));
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(1);
    expect(provider.callback).toHaveBeenLastCalledWith(request, response);
    expect(interactionHttpHandler.handle).toHaveBeenCalledTimes(0);
    expect(errorResponseWriter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('calls the interaction handler if it can handle the input.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(0);
    expect(interactionHttpHandler.handle).toHaveBeenCalledTimes(1);
    expect(interactionHttpHandler.handle).toHaveBeenLastCalledWith({ request, response, provider });
    expect(errorResponseWriter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('calls the errorResponseWriter if there was an issue with the interaction handler.', async(): Promise<void> => {
    const error = new Error('error!');
    (interactionHttpHandler.handle as jest.Mock).mockRejectedValueOnce(error);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(0);
    expect(interactionHttpHandler.handle).toHaveBeenCalledTimes(1);
    expect(interactionHttpHandler.handle).toHaveBeenLastCalledWith({ request, response, provider });
    expect(errorResponseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorResponseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: error });
  });

  it('re-throws the error if it is not a native Error.', async(): Promise<void> => {
    (interactionHttpHandler.handle as jest.Mock).mockRejectedValueOnce('apple!');
    await expect(handler.handle({ request, response })).rejects.toEqual('apple!');
  });

  it('caches the provider after creating it.', async(): Promise<void> => {
    expect(providerFactory.createProvider).toHaveBeenCalledTimes(0);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(providerFactory.createProvider).toHaveBeenCalledTimes(1);
    expect(providerFactory.createProvider).toHaveBeenLastCalledWith(interactionPolicy);
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(providerFactory.createProvider).toHaveBeenCalledTimes(1);
  });

  it('errors if there is an issue creating the provider.', async(): Promise<void> => {
    const error = new Error('error!');
    (providerFactory.createProvider as jest.Mock).mockRejectedValueOnce(error);
    await expect(handler.handle({ request, response })).rejects.toThrow(error);
  });
});
