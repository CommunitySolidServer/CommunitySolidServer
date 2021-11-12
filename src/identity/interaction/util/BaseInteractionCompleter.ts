import type { InteractionResults } from 'oidc-provider';
import type { InteractionCompleterInput } from './InteractionCompleter';
import { InteractionCompleter } from './InteractionCompleter';

/**
 * Creates a simple InteractionResults object based on the input parameters and injects it in the Interaction.
 */
export class BaseInteractionCompleter extends InteractionCompleter {
  public async handle(input: InteractionCompleterInput): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const result: InteractionResults = {
      login: {
        account: input.webId,
        // Indicates if a persistent cookie should be used instead of a session cookie.
        remember: input.shouldRemember,
        ts: now,
      },
      consent: {
        // When OIDC clients want a refresh token, they need to request the 'offline_access' scope.
        // This indicates that this scope is not granted to the client in case they do not want to be remembered.
        rejectedScopes: input.shouldRemember ? [] : [ 'offline_access' ],
      },
    };

    // Generates the URL a client needs to be redirected to
    // after a successful interaction completion (such as logging in).
    // Identical behaviour to calling `provider.interactionResult`.
    // We use the code below instead of calling that function
    // since that function also uses Request/Response objects to generate the Interaction object,
    // which we already have here.
    const { oidcInteraction } = input;
    oidcInteraction.result = { ...oidcInteraction.lastSubmission, ...result };
    await oidcInteraction.save(oidcInteraction.exp - now);

    return oidcInteraction.returnTo;
  }
}
