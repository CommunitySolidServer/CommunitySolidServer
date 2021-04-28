import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { InteractionHttpHandlerInput } from './InteractionHttpHandler';
import { InteractionHttpHandler } from './InteractionHttpHandler';
import type { InteractionCompleter } from './util/InteractionCompleter';

/**
 * Simple InteractionHttpHandler that sends the session accountId to the InteractionCompleter as webId.
 */
export class SessionHttpHandler extends InteractionHttpHandler {
  private readonly interactionCompleter: InteractionCompleter;

  public constructor(interactionCompleter: InteractionCompleter) {
    super();
    this.interactionCompleter = interactionCompleter;
  }

  public async handle(input: InteractionHttpHandlerInput): Promise<void> {
    const details = await input.provider.interactionDetails(input.request, input.response);
    if (!details.session || !details.session.accountId) {
      throw new NotImplementedHttpError('Only confirm actions with a session and accountId are supported');
    }
    await this.interactionCompleter.handleSafe({ ...input, webId: details.session.accountId });
  }
}
