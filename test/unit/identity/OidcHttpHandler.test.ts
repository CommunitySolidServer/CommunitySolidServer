import type { Provider } from 'oidc-provider';
import type { ProviderFactory } from '../../../src/identity/configuration/ProviderFactory';
import { OidcHttpHandler } from '../../../src/identity/OidcHttpHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';

describe('An OidcHttpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let provider: jest.Mocked<Provider>;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let handler: OidcHttpHandler;

  beforeEach(async(): Promise<void> => {
    provider = {
      callback: jest.fn(),
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    handler = new OidcHttpHandler(providerFactory);
  });

  it('sends all requests to the OIDC library.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(provider.callback).toHaveBeenCalledTimes(1);
    expect(provider.callback).toHaveBeenLastCalledWith(request, response);
  });
});
