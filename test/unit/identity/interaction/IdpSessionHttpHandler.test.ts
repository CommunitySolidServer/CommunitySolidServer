import type { Provider } from 'oidc-provider';
import { IdpSessionHttpHandler } from '../../../../src/identity/interaction/IdpSessionHttpHandler';
import type { OidcInteractionCompleter } from '../../../../src/identity/interaction/util/OidcInteractionCompleter';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('An IdpSessionHttpHandler', (): void => {
  const request: HttpRequest = 'request!' as any;
  const response: HttpResponse = 'response!' as any;
  const webId = 'http://test.com/id#me';
  let details: any = {};
  let provider: Provider;
  let oidcInteractionCompleter: OidcInteractionCompleter;
  let handler: IdpSessionHttpHandler;

  beforeEach(async(): Promise<void> => {
    details = { session: { accountId: webId }};
    provider = {
      interactionDetails: jest.fn().mockResolvedValue(details),
    } as any;

    oidcInteractionCompleter = {
      handleSafe: jest.fn(),
    } as any;

    handler = new IdpSessionHttpHandler(oidcInteractionCompleter);
  });

  it('requires a session and accountId.', async(): Promise<void> => {
    details.session = undefined;
    await expect(handler.handle({ request, response, provider })).rejects.toThrow(NotImplementedHttpError);

    details.session = { accountId: undefined };
    await expect(handler.handle({ request, response, provider })).rejects.toThrow(NotImplementedHttpError);
  });

  it('calls the oidc completer with the webId in the session.', async(): Promise<void> => {
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
    expect(oidcInteractionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(oidcInteractionCompleter.handleSafe).toHaveBeenLastCalledWith({
      request,
      response,
      provider,
      webId,
    });
  });
});
