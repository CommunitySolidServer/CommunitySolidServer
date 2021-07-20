import type { Provider } from 'oidc-provider';
import type { RenderHandlerMap } from '../../../../../src/identity/interaction/util/InitialInteractionHandler';
import { InitialInteractionHandler } from '../../../../../src/identity/interaction/util/InitialInteractionHandler';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';

describe('An InitialInteractionHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let provider: Provider;
  // `Interaction` type is not exposed
  let details: any;
  let map: RenderHandlerMap;
  let handler: InitialInteractionHandler;

  beforeEach(async(): Promise<void> => {
    map = {
      default: { handleSafe: jest.fn() },
      test: { handleSafe: jest.fn() },
    } as any;

    details = { prompt: { name: 'test' }};
    provider = {
      interactionDetails: jest.fn().mockResolvedValue(details),
    } as any;

    handler = new InitialInteractionHandler(map);
  });

  it('uses the named handler if it is found.', async(): Promise<void> => {
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
    expect(map.default.handleSafe).toHaveBeenCalledTimes(0);
    expect(map.test.handleSafe).toHaveBeenCalledTimes(1);
    expect(map.test.handleSafe).toHaveBeenLastCalledWith({
      response,
      contents: {
        errorMessage: '',
        prefilled: {},
      },
    });
  });

  it('uses the default handler if there is no match.', async(): Promise<void> => {
    details.prompt.name = 'unknown';
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
    expect(map.default.handleSafe).toHaveBeenCalledTimes(1);
    expect(map.test.handleSafe).toHaveBeenCalledTimes(0);
    expect(map.default.handleSafe).toHaveBeenLastCalledWith({
      response,
      contents: {
        errorMessage: '',
        prefilled: {},
      },
    });
  });
});
