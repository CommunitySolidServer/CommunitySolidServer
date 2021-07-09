import type { MockResponse } from 'node-mocks-http';
import { createResponse } from 'node-mocks-http';
import type { Provider } from 'oidc-provider';
import type { RedirectMap } from '../../../../../src/identity/interaction/util/InitialInteractionHandler';
import { InitialInteractionHandler } from '../../../../../src/identity/interaction/util/InitialInteractionHandler';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';

describe('An InitialInteractionHandler', (): void => {
  const baseUrl = 'http://test.com/';
  const request: HttpRequest = {} as any;
  let response: MockResponse<any>;
  let provider: jest.Mocked<Provider>;
  // `Interaction` type is not exposed
  let details: any;
  let map: RedirectMap;
  let handler: InitialInteractionHandler;

  beforeEach(async(): Promise<void> => {
    response = createResponse();

    map = {
      default: '/idp/login',
      test: '/idp/test',
    };

    details = { prompt: { name: 'test' }};
    provider = {
      interactionDetails: jest.fn().mockResolvedValue(details),
    } as any;

    handler = new InitialInteractionHandler(baseUrl, map);
  });

  it('uses the named handler if it is found.', async(): Promise<void> => {
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
    expect(response._isEndCalled()).toBe(true);
    expect(response.getHeader('location')).toBe('http://test.com/idp/test');
    expect(response.statusCode).toBe(302);
  });

  it('uses the default handler if there is no match.', async(): Promise<void> => {
    details.prompt.name = 'unknown';
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
    expect(response._isEndCalled()).toBe(true);
    expect(response.getHeader('location')).toBe('http://test.com/idp/login');
    expect(response.statusCode).toBe(302);
  });
});
