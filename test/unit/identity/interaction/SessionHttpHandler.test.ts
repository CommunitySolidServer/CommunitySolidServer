import type { Provider } from 'oidc-provider';
import type { ProviderFactory } from '../../../../src/identity/configuration/ProviderFactory';
import { SessionHttpHandler } from '../../../../src/identity/interaction/SessionHttpHandler';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A SessionHttpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  const webId = 'http://test.com/id#me';
  let details: any = {};
  let provider: Provider;
  let handler: SessionHttpHandler;

  beforeEach(async(): Promise<void> => {
    details = { session: { accountId: webId }};
    provider = {
      interactionDetails: jest.fn().mockResolvedValue(details),
    } as any;

    const factory: ProviderFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    handler = new SessionHttpHandler(factory);
  });

  it('requires a session and accountId.', async(): Promise<void> => {
    details.session = undefined;
    await expect(handler.handle({ request, response })).rejects.toThrow(NotImplementedHttpError);

    details.session = { accountId: undefined };
    await expect(handler.handle({ request, response })).rejects.toThrow(NotImplementedHttpError);
  });

  it('calls the oidc completer with the webId in the session.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toEqual({
      details: { webId },
      type: 'complete',
    });
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
  });
});
