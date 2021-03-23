import type { Provider } from 'oidc-provider';
import type { RenderHandlerMap } from '../../../../../src/identity/interaction/util/ChooseInitialInteractionHandler';
import {
  ChooseInitialInteractionHandler,
} from '../../../../../src/identity/interaction/util/ChooseInitialInteractionHandler';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';

describe('ChooseInitialInteractionHandler', (): void => {
  const request: HttpRequest = 'request!' as any;
  const response: HttpResponse = 'response!' as any;
  let provider: Provider;
  let details: any;
  let map: RenderHandlerMap;
  let handler: ChooseInitialInteractionHandler;

  beforeEach(async(): Promise<void> => {
    map = {
      default: { handleSafe: jest.fn() },
      test: { handleSafe: jest.fn() },
    } as any;

    details = { prompt: { name: 'test' }};
    provider = {
      interactionDetails: jest.fn().mockResolvedValue(details),
    } as any;

    handler = new ChooseInitialInteractionHandler(map);
  });

  it('uses the named handler if it is found.', async(): Promise<void> => {
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(provider.interactionDetails).toHaveBeenCalledTimes(1);
    expect(provider.interactionDetails).toHaveBeenLastCalledWith(request, response);
    expect(map.default.handleSafe).toHaveBeenCalledTimes(0);
    expect(map.test.handleSafe).toHaveBeenCalledTimes(1);
    expect(map.test.handleSafe).toHaveBeenLastCalledWith({
      response,
      props: {
        details,
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
      props: {
        details,
        errorMessage: '',
        prefilled: {},
      },
    });
  });
});
