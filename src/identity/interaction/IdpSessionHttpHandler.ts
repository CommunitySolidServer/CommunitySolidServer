import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { IdpInteractionHttpHandlerInput } from './IdpInteractionHttpHandler';
import { IdpInteractionHttpHandler } from './IdpInteractionHttpHandler';
import type { OidcInteractionCompleter } from './util/OidcInteractionCompleter';

/**
 * Simple IdpInteractionHttpHandler that sends the session accountId to the OidcInteractionCompleter as webId.
 */
export class IdpSessionHttpHandler extends IdpInteractionHttpHandler {
  private readonly oidcInteractionCompleter: OidcInteractionCompleter;

  public constructor(oidcInteractionCompleter: OidcInteractionCompleter) {
    super();
    this.oidcInteractionCompleter = oidcInteractionCompleter;
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
    const details = await input.provider.interactionDetails(input.request, input.response);
    if (!details.session || !details.session.accountId) {
      throw new NotImplementedHttpError('Only confirm actions with a session and accountId are supported');
    }
    await this.oidcInteractionCompleter.handleSafe({ ...input, webId: details.session.accountId });
  }
}
