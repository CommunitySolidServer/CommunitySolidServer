import type { InteractionResults } from 'oidc-provider';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { InteractionHttpHandlerInput } from '../InteractionHttpHandler';

export interface InteractionCompleterInput extends InteractionHttpHandlerInput {
  webId: string;
  shouldRemember?: boolean;
}

/**
 * Completes an IDP interaction, logging the user in.
 */
export class InteractionCompleter extends AsyncHandler<InteractionCompleterInput> {
  public async handle(input: InteractionCompleterInput): Promise<void> {
    const result: InteractionResults = {
      login: {
        account: input.webId,
        remember: input.shouldRemember,
        ts: Math.floor(Date.now() / 1000),
      },
      consent: {
        rejectedScopes: input.shouldRemember ? [] : [ 'offline_access' ],
      },
    };

    return input.provider.interactionFinished(input.request, input.response, result);
  }
}
