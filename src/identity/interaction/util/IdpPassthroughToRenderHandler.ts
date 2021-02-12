import type { IdpInteractionHttpHandlerInput } from '../IdpInteractionHttpHandler';
import { IdpInteractionHttpHandler } from '../IdpInteractionHttpHandler';
import type { IdpRenderHandler } from './IdpRenderHandler';

/**
 * Extracts required information from the identity provider and passes it to
 * an IdpRenderHandler.
 */
export class IdpPassthroughToRenderHandler extends IdpInteractionHttpHandler {
  private readonly renderHandler: IdpRenderHandler;

  public constructor(renderHandler: IdpRenderHandler) {
    super();
    this.renderHandler = renderHandler;
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
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
