import { getLoggerFor } from '../../../logging/LogUtil';
import type { InteractionHttpHandlerInput } from '../InteractionHttpHandler';
import { InteractionHttpHandler } from '../InteractionHttpHandler';
import type { IdpRenderHandler } from './IdpRenderHandler';

export interface RenderHandlerMap {
  [key: string]: IdpRenderHandler;
  default: IdpRenderHandler;
}

/**
 * An {@link InteractionHttpHandler} that redirects requests
 * to a specific {@link IdpRenderHandler} based on their prompt.
 * A list of possible prompts can be found at https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
 * In case there is no prompt or there is no match in the input map,
 * the `default` render handler will be used.
 *
 * Specifically, the prompt determines how the server should handle re-authentication and consent.
 *
 * Since this class specifically redirects to render handlers,
 * it is advised to wrap it in a {@link RouterHandler} that only allows GET requests.
 */
export class InitialInteractionHandler extends InteractionHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly renderHandlerMap: RenderHandlerMap;

  public constructor(renderHandlerMap: RenderHandlerMap) {
    super();
    this.renderHandlerMap = renderHandlerMap;
  }

  public async handle({ request, response, provider }: InteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await provider.interactionDetails(request, response);
    const name = interactionDetails.prompt.name in this.renderHandlerMap ? interactionDetails.prompt.name : 'default';

    this.logger.debug(`Calling ${name} render handler.`);

    await this.renderHandlerMap[name].handleSafe({
      response,
      props: {
        details: interactionDetails,
        errorMessage: '',
        prefilled: {},
      },
    });
  }
}
