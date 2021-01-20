import type { IdPInteractionHttpHandlerInput } from '../IdPInteractionHttpHandler';
import { IdPInteractionHttpHandler } from '../IdPInteractionHttpHandler';
import type { IdpRenderHandler } from './IdpRenderHandler';

export class IdpPassthroughToRenderHandler extends IdPInteractionHttpHandler {
  private readonly renderHandler: IdpRenderHandler;

  public constructor(renderHandler: IdpRenderHandler) {
    super();
    this.renderHandler = renderHandler;
  }

  public async handle(input: IdPInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(input.request, input.response);
    await this.renderHandler.handle({
      response: input.response,
      props: {
        details: interactionDetails,
        errorMessage: '',
        prefilled: {},
      },
    });
  }
}
