import type { HttpHandler } from '../../../server/HttpHandler';
import { RouterHandler } from '../../../server/util/RouterHandler';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import type { InteractionHttpHandlerInput } from '../InteractionHttpHandler';
import { IdpInteractionError } from './IdpInteractionError';
import type { IdpRenderHandler } from './IdpRenderHandler';

/**
 * Handles an IDP interaction route.
 * All routes render their UI on a GET and accept POST requests to handle the interaction.
 */
export class IdpRouteController extends RouterHandler {
  private readonly renderHandler: IdpRenderHandler;

  public constructor(pathName: string, renderHandler: IdpRenderHandler, postHandler: HttpHandler) {
    super(postHandler, [ 'GET', 'POST' ], [ pathName ]);
    this.renderHandler = renderHandler;
  }

  /**
   * Calls the renderHandler to render using the given response and props.
   */
  private async render(input: InteractionHttpHandlerInput, errorMessage = '', prefilled = {}):
  Promise<void> {
    return this.renderHandler.handleSafe({
      response: input.response,
      props: { errorMessage, prefilled },
    });
  }

  public async handle(input: InteractionHttpHandlerInput): Promise<void> {
    if (input.request.method === 'GET') {
      await this.render(input);
    } else if (input.request.method === 'POST') {
      try {
        await this.handler.handleSafe(input);
      } catch (err: unknown) {
        const prefilled = IdpInteractionError.isInstance(err) ? err.prefilled : {};
        await this.render(input, createErrorMessage(err), prefilled);
      }
    }
  }
}
