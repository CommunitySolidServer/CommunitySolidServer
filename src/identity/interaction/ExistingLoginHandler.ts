import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { readJsonStream } from '../../util/StreamUtil';
import { CompletingInteractionHandler } from './CompletingInteractionHandler';
import type { InteractionHandlerInput } from './InteractionHandler';
import type { InteractionCompleter, InteractionCompleterInput } from './util/InteractionCompleter';

/**
 * Simple CompletingInteractionRoute that returns the session accountId as webId.
 * This is relevant when a client already logged in this session and tries logging in again.
 */
export class ExistingLoginHandler extends CompletingInteractionHandler {
  public constructor(interactionCompleter: InteractionCompleter) {
    super({}, interactionCompleter);
  }

  protected async getCompletionParameters({ operation, oidcInteraction }: Required<InteractionHandlerInput>):
  Promise<InteractionCompleterInput> {
    if (!oidcInteraction.session) {
      throw new NotImplementedHttpError('Only interactions with a valid session are supported.');
    }

    const { remember } = await readJsonStream(operation.body.data);
    return { oidcInteraction, webId: oidcInteraction.session.accountId, shouldRemember: Boolean(remember) };
  }
}
