import type { HttpHandler } from '../../../server/HttpHandler';
import { RouterHandler } from '../../../server/util/RouterHandler';
import { isNativeError } from '../../../util/errors/ErrorUtil';
import type { IdpInteractionHttpHandlerInput } from '../IdpInteractionHttpHandler';
import { IdpInteractionError } from './IdpInteractionError';
import type { IdpRenderHandler } from './IdpRenderHandler';

/**
 * Handles an Idp interaction route. All routes need to extract interaction details to render
 * the UI and accept a POST request to do some action.
 */
export class IdpRouteController extends RouterHandler {
  private readonly renderHandler: IdpRenderHandler;

  public constructor(pathName: string, renderHandler: IdpRenderHandler, postHandler: HttpHandler) {
    super(postHandler, [ 'GET', 'POST' ], [ pathName ]);
    this.renderHandler = renderHandler;
  }

  /**
   * Calls the renderHandler to render using the given response and props.
   * `details` typed as any since the `interactionDetails` output typings are not exposed.
   */
  private async render(input: IdpInteractionHttpHandlerInput, details: any, errorMessage = '', prefilled = {}):
  Promise<void> {
    return this.renderHandler.handleSafe({
      response: input.response,
      props: { details, errorMessage, prefilled },
    });
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(input.request, input.response);
    if (input.request.method === 'GET') {
      await this.render(input, interactionDetails);
    } else if (input.request.method === 'POST') {
      try {
        await this.handler.handleSafe(input);
      } catch (err: unknown) {
        const errorMessage = isNativeError(err) ? err.message : 'An unknown error occurred';
        const prefilled = IdpInteractionError.isInstance(err) ? err.prefilled : {};
        await this.render(input, interactionDetails, errorMessage, prefilled);
      }
    }
  }
}
