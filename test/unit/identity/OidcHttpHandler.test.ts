import type { ProviderFactory } from '../../../src/identity/configuration/ProviderFactory';
import { OidcHttpHandler } from '../../../src/identity/OidcHttpHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import type Provider from '../../../templates/types/oidc-provider';

describe('An OidcHttpHandler', (): void => {
  const request: HttpRequest = {
    url: '/.well-known/openid-configuration',
  } as any;
  const response: HttpResponse = {} as any;
  let provider: jest.Mocked<Provider>;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let handler: OidcHttpHandler;

  beforeEach(async(): Promise<void> => {
    provider = {
      callback: jest.fn().mockReturnValue(jest.fn()),
      issuer: 'http://localhost:3000/',
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    } as any;

    handler = new OidcHttpHandler(providerFactory);
  });

  it('sends all requests to the OIDC library.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(1);
    expect(provider.callback.mock.results[0].value).toHaveBeenCalledTimes(1);
    expect(provider.callback.mock.results[0].value).toHaveBeenLastCalledWith(request, response);
  });

  it('rewrites the request when using base URL with root path.', async(): Promise<void> => {
    Object.assign(provider, { issuer: 'http://localhost:3000/path/' });
    request.url = '/path/.well-known/openid-configuration';
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(request.url).toBe('/.well-known/openid-configuration');
    expect(provider.callback).toHaveBeenCalledTimes(1);
    expect(provider.callback.mock.results[0].value).toHaveBeenCalledTimes(1);
    expect(provider.callback.mock.results[0].value).toHaveBeenLastCalledWith(request, response);
  });

  it('respects query parameters when rewriting requests.', async(): Promise<void> => {
    Object.assign(provider, { issuer: 'http://localhost:3000/path/' });
    request.url = '/path/.well-known/openid-configuration?param1=value1';
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(request.url).toBe('/.well-known/openid-configuration?param1=value1');
    expect(provider.callback).toHaveBeenCalledTimes(1);
    expect(provider.callback.mock.results[0].value).toHaveBeenCalledTimes(1);
    expect(provider.callback.mock.results[0].value).toHaveBeenLastCalledWith(request, response);
  });
});
