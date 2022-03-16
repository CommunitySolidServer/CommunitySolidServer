import type { Operation } from '../../../src/http/Operation';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import type { ProviderFactory } from '../../../src/identity/configuration/ProviderFactory';
import type { IdentityProviderHttpHandlerArgs } from '../../../src/identity/IdentityProviderHttpHandler';
import { IdentityProviderHttpHandler } from '../../../src/identity/IdentityProviderHttpHandler';
import type { CookieStore } from '../../../src/identity/interaction/account/util/CookieStore';
import type { Interaction, InteractionHandler } from '../../../src/identity/interaction/InteractionHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import { SOLID_HTTP } from '../../../src/util/Vocabularies';
import type Provider from '../../../templates/types/oidc-provider';

describe('An IdentityProviderHttpHandler', (): void => {
  const cookie = 'cookie';
  const accountId = 'accountId';
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  const oidcInteraction: Interaction = {} as any;
  let operation: Operation;
  let representation: Representation;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let provider: jest.Mocked<Provider>;
  let cookieStore: jest.Mocked<CookieStore>;
  let handler: jest.Mocked<InteractionHandler>;
  let idpHandler: IdentityProviderHttpHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: 'http://test.com/idp' },
      preferences: { type: { 'text/html': 1 }},
      body: new BasicRepresentation(),
    };
    operation.body.metadata.set(SOLID_HTTP.terms.accountCookie, cookie);

    provider = {
      interactionDetails: jest.fn().mockReturnValue(oidcInteraction),
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    cookieStore = {
      generate: jest.fn(),
      get: jest.fn().mockResolvedValue(accountId),
      delete: jest.fn(),
      refresh: jest.fn(),
    };

    representation = new BasicRepresentation();
    handler = {
      handleSafe: jest.fn().mockResolvedValue(representation),
    } as any;

    const args: IdentityProviderHttpHandlerArgs = {
      providerFactory,
      cookieStore,
      handler,
    };
    idpHandler = new IdentityProviderHttpHandler(args);
  });

  it('returns the handler result as 200 response.', async(): Promise<void> => {
    const result = await idpHandler.handle({ operation, request, response });
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe(representation.data);
    expect(result.metadata).toBe(representation.metadata);
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
    expect(cookieStore.get).toHaveBeenCalledTimes(1);
    expect(cookieStore.get).toHaveBeenLastCalledWith(cookie);
    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({ operation, oidcInteraction, accountId });
  });

  it('passes no interaction if the provider call failed.', async(): Promise<void> => {
    provider.interactionDetails.mockRejectedValueOnce(new Error('no interaction'));
    const result = await idpHandler.handle({ operation, request, response });
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe(representation.data);
    expect(result.metadata).toBe(representation.metadata);
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
    expect(cookieStore.get).toHaveBeenCalledTimes(1);
    expect(cookieStore.get).toHaveBeenLastCalledWith(cookie);
    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({ operation, accountId });
  });

  it('passes no accountID if there is no cookie.', async(): Promise<void> => {
    operation.body.metadata.removeAll(SOLID_HTTP.terms.accountCookie);
    const result = await idpHandler.handle({ operation, request, response });
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe(representation.data);
    expect(result.metadata).toBe(representation.metadata);
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
    expect(cookieStore.get).toHaveBeenCalledTimes(0);
    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({ operation, oidcInteraction });
  });
});
