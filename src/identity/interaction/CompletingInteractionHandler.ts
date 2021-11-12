import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../util/errors/FoundHttpError';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';
import type { InteractionCompleterInput, InteractionCompleter } from './util/InteractionCompleter';

/**
 * Abstract class for {@link InteractionHandler}s that need to call an {@link InteractionCompleter}.
 * This is required by handlers that handle IDP behaviour
 * and need to complete an OIDC interaction by redirecting back to the client,
 * such as when logging in.
 *
 * Calls the InteractionCompleter with the results returned by the helper function
 * and throw a corresponding {@link FoundHttpError}.
 */
export abstract class CompletingInteractionHandler extends InteractionHandler {
  protected readonly interactionCompleter: InteractionCompleter;

  protected constructor(interactionCompleter: InteractionCompleter) {
    super();
    this.interactionCompleter = interactionCompleter;
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    await super.canHandle(input);
    if (!input.oidcInteraction) {
      throw new BadRequestHttpError(
        'This action can only be performed as part of an OIDC authentication flow.',
        { errorCode: 'E0002' },
      );
    }
  }

  public async handle(input: InteractionHandlerInput): Promise<never> {
    // Interaction is defined due to canHandle call
    const parameters = await this.getCompletionParameters(input as Required<InteractionHandlerInput>);
    const location = await this.interactionCompleter.handleSafe(parameters);
    throw new FoundHttpError(location);
  }

  /**
   * Generates the parameters necessary to call an InteractionCompleter.
   * @param input - The original input parameters to the `handle` function.
   */
  protected abstract getCompletionParameters(input: Required<InteractionHandlerInput>):
  Promise<InteractionCompleterInput>;
}
