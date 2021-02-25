import type { HttpHandler } from '../../../server/HttpHandler';
import { RouterHandler } from '../../../server/util/RouterHandler';
import type { IdpInteractionHttpHandlerInput } from '../IdpInteractionHttpHandler';
import type { IdpRenderHandler } from './IdpRenderHandler';

/**
 * Handles an Idp interaction route. All routes need to extract interaction details to render
 * the UI and accept a POST request to do some action.
 */
export class IdpRouteController extends RouterHandler {
  private readonly renderHandler: IdpRenderHandler;

  public constructor(pathname: string, renderHandler: IdpRenderHandler, postHandler: HttpHandler) {
    super(postHandler, [ 'GET', 'POST' ], [ pathname ]);
    this.renderHandler = renderHandler;
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(input.request, input.response);
    if (input.request.method === 'GET') {
      await this.renderHandler.handle({
        response: input.response,
        props: {
          details: interactionDetails,
          errorMessage: '',
          prefilled: {},
        },
      });
    } else if (input.request.method === 'POST') {
      try {
        await this.handler.handle(input);
      } catch (err: unknown) {
        const errorMessage: string = (err as Error).message || 'An unknown error occurred';
        const prefilled = (err as { prefilled: Record<string, string> }).prefilled || {};
        await this.renderHandler.handle({
          response: input.response,
          props: {
            details: interactionDetails,
            errorMessage,
            prefilled,
          },
        });
      }
    }
  }
}
