import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { InteractionHandler } from './email-password/handler/InteractionHandler';
import type { InteractionCompleteResult, InteractionHandlerInput } from './email-password/handler/InteractionHandler';
import { getFormDataRequestBody } from './util/FormDataUtil';

/**
 * Simple InteractionHttpHandler that sends the session accountId to the InteractionCompleter as webId.
 */
export class SessionHttpHandler extends InteractionHandler {
  public async handle({ request, oidcInteraction }: InteractionHandlerInput): Promise<InteractionCompleteResult> {
    if (!oidcInteraction?.session) {
      throw new NotImplementedHttpError('Only interactions with a valid session are supported.');
    }

    const { remember } = await getFormDataRequestBody(request);
    return {
      type: 'complete',
      details: { webId: oidcInteraction.session.accountId, shouldRemember: Boolean(remember) },
    };
  }
}
