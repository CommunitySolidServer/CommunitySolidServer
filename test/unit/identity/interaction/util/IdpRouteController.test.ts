import type { Provider } from 'oidc-provider';
import { IdpInteractionError } from '../../../../../src/identity/interaction/util/IdpInteractionError';
import type { IdpRenderHandler } from '../../../../../src/identity/interaction/util/IdpRenderHandler';
import {
  IdpRouteController,
} from '../../../../../src/identity/interaction/util/IdpRouteController';
import type { HttpHandler } from '../../../../../src/server/HttpHandler';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';

describe('An IdpRouteController', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
  // `Interaction` type is not exposed
  const details = {} as any;
  let provider: Provider;
  let renderHandler: IdpRenderHandler;
  let postHandler: HttpHandler;
  let controller: IdpRouteController;

  beforeEach(async(): Promise<void> => {
    request = {
      randomData: 'data!',
      method: 'GET',
    } as any;

    provider = {
      interactionDetails: jest.fn().mockResolvedValue(details),
    } as any;

    renderHandler = {
      handleSafe: jest.fn(),
    } as any;

    postHandler = {
      handleSafe: jest.fn(),
    } as any;

    controller = new IdpRouteController('pathName', renderHandler, postHandler);
  });

  it('renders the renderHandler for GET requests.', async(): Promise<void> => {
    await expect(controller.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({
      response,
      props: { details, errorMessage: '', prefilled: {}},
    });
    expect(postHandler.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('calls the postHandler for POST requests.', async(): Promise<void> => {
    request.method = 'POST';
    await expect(controller.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(postHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(postHandler.handleSafe).toHaveBeenLastCalledWith({ request, response, provider });
  });

  it('renders an error if the POST request failed.', async(): Promise<void> => {
    request.method = 'POST';
    const error = new IdpInteractionError(400, 'bad request!', { more: 'data!' });
    (postHandler.handleSafe as jest.Mock).mockRejectedValueOnce(error);
    await expect(controller.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(postHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(postHandler.handleSafe).toHaveBeenLastCalledWith({ request, response, provider });
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({
      response,
      props: { details, errorMessage: 'bad request!', prefilled: { more: 'data!' }},
    });
  });

  it('has a default error message if none is provided.', async(): Promise<void> => {
    request.method = 'POST';
    (postHandler.handleSafe as jest.Mock).mockRejectedValueOnce('apple!');
    await expect(controller.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(postHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(postHandler.handleSafe).toHaveBeenLastCalledWith({ request, response, provider });
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({
      response,
      props: { details, errorMessage: 'An unknown error occurred', prefilled: {}},
    });
  });

  it('does nothing for other methods.', async(): Promise<void> => {
    request.method = 'DELETE';
    await expect(controller.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(postHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(0);
  });
});
