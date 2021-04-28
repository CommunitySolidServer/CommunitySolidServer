import { getLoggerFor } from '../../../logging/LogUtil';
import type { InteractionHttpHandlerInput } from '../InteractionHttpHandler';
import { InteractionHttpHandler } from '../InteractionHttpHandler';
import type { IdpRenderHandler } from './IdpRenderHandler';

export interface RenderHandlerMap {
  [key: string]: IdpRenderHandler;
  default: IdpRenderHandler;
}

/**
 * An interaction that will choose the form of the render given
 * a certain interaction name. Interaction names can be passed
 * in via the "renderHandlerMap" which maps the interaction name
 * to the render handler. The key "default" will be used if the
 * interaction name doesn't match anything in the RenderHandlerMap
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
