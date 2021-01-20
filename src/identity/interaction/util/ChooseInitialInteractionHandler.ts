import { getLoggerFor } from '../../../logging/LogUtil';
import type { IdPInteractionHttpHandlerInput } from '../IdPInteractionHttpHandler';
import { IdPInteractionHttpHandler } from '../IdPInteractionHttpHandler';
import type { IdpRenderHandler } from './IdpRenderHandler';

export interface RenderHandlerMap {
  [key: string]: IdpRenderHandler;
  default: IdpRenderHandler;
}

export class ChooseInitialInteractionHandler extends IdPInteractionHttpHandler {
  private readonly renderHandlerMap: RenderHandlerMap;
  private readonly logger = getLoggerFor(this);

  public constructor(renderHandlerMap: RenderHandlerMap) {
    super();
    this.renderHandlerMap = renderHandlerMap;
  }

  public async handle(input: IdPInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(input.request, input.response);
    const renderHandler = this.renderHandlerMap[interactionDetails.prompt.name] || this.renderHandlerMap.default;
    await renderHandler.handle({
      response: input.response,
      props: {
        details: interactionDetails,
        errorMessage: '',
        prefilled: {},
      },
    });
  }
}
