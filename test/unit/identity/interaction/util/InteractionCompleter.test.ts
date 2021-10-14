import { ServerResponse } from 'http';
import type { Provider } from 'oidc-provider';
import type { ProviderFactory } from '../../../../../src/identity/configuration/ProviderFactory';
import { InteractionCompleter } from '../../../../../src/identity/interaction/util/InteractionCompleter';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';

jest.useFakeTimers();

describe('An InteractionCompleter', (): void => {
  const request: HttpRequest = {} as any;
  const webId = 'http://alice.test.com/#me';
  let provider: jest.Mocked<Provider>;
  let completer: InteractionCompleter;

  beforeEach(async(): Promise<void> => {
    provider = {
      interactionResult: jest.fn(),
    } as any;

    const factory: ProviderFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    completer = new InteractionCompleter(factory);
  });

  it('sends the correct data to the provider.', async(): Promise<void> => {
    await expect(completer.handle({ request, webId, shouldRemember: true }))
      .resolves.toBeUndefined();
    expect(provider.interactionResult).toHaveBeenCalledTimes(1);
    expect(provider.interactionResult).toHaveBeenLastCalledWith(request, expect.any(ServerResponse), {
      login: {
        account: webId,
        remember: true,
        ts: Math.floor(Date.now() / 1000),
      },
      consent: {
        rejectedScopes: [],
      },
    });
  });

  it('rejects offline access if shouldRemember is false.', async(): Promise<void> => {
    await expect(completer.handle({ request, webId, shouldRemember: false }))
      .resolves.toBeUndefined();
    expect(provider.interactionResult).toHaveBeenCalledTimes(1);
    expect(provider.interactionResult).toHaveBeenLastCalledWith(request, expect.any(ServerResponse), {
      login: {
        account: webId,
        remember: false,
        ts: Math.floor(Date.now() / 1000),
      },
      consent: {
        rejectedScopes: [ 'offline_access' ],
      },
    });
  });
});
