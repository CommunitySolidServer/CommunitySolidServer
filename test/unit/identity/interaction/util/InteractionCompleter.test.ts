import type { Provider } from 'oidc-provider';
import { InteractionCompleter } from '../../../../../src/identity/interaction/util/InteractionCompleter';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';

// Use fixed dates
jest.useFakeTimers();

describe('An InteractionCompleter', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  const webId = 'http://alice.test.com/#me';
  let provider: Provider;
  const completer = new InteractionCompleter();

  beforeEach(async(): Promise<void> => {
    provider = {
      interactionFinished: jest.fn(),
    } as any;
  });

  it('sends the correct data to the provider.', async(): Promise<void> => {
    await expect(completer.handle({ request, response, provider, webId, shouldRemember: true }))
      .resolves.toBeUndefined();
    expect(provider.interactionFinished).toHaveBeenCalledTimes(1);
    expect(provider.interactionFinished).toHaveBeenLastCalledWith(request, response, {
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
    await expect(completer.handle({ request, response, provider, webId, shouldRemember: false }))
      .resolves.toBeUndefined();
    expect(provider.interactionFinished).toHaveBeenCalledTimes(1);
    expect(provider.interactionFinished).toHaveBeenLastCalledWith(request, response, {
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
