import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { SOLID_HTTP } from '../../util/Vocabularies';
import { ACCOUNT_SETTINGS_REMEMBER_LOGIN } from './account/util/AccountStore';
import type { AccountStore } from './account/util/AccountStore';
import type { CookieStore } from './account/util/CookieStore';
import type { JsonRepresentation } from './InteractionUtil';
import type { JsonInteractionHandlerInput } from './JsonInteractionHandler';
import { JsonInteractionHandler } from './JsonInteractionHandler';

/**
 * Handles all the necessary steps for having cookies.
 * Refreshes the cookie expiration if there was a successful account interaction.
 * Adds the cookie and cookie expiration data to the output metadata,
 * unless it is already present in that metadata.
 * Checks the account settings to see if the cookie needs to be remembered.
 */
export class CookieInteractionHandler extends JsonInteractionHandler {
  private readonly source: JsonInteractionHandler;
  private readonly accountStore: AccountStore;
  private readonly cookieStore: CookieStore;

  public constructor(source: JsonInteractionHandler, accountStore: AccountStore, cookieStore: CookieStore) {
    super();
    this.source = source;
    this.accountStore = accountStore;
    this.cookieStore = cookieStore;
  }

  public async canHandle(input: JsonInteractionHandlerInput): Promise<void> {
    return this.source.canHandle(input);
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    const output = await this.source.handle(input);

    let { metadata: outputMetadata } = output;

    // The cookie could be new, in the output, or the one received in the input if no new cookie is made
    const cookie = outputMetadata?.get(SOLID_HTTP.terms.accountCookie)?.value ??
      input.metadata.get(SOLID_HTTP.terms.accountCookie)?.value;
    // Only update the expiration if it wasn't set by the source handler,
    // as that might have a specific reason, such as logging out.
    if (!cookie || outputMetadata?.has(SOLID_HTTP.terms.accountCookieExpiration)) {
      return output;
    }
    // Not reusing the account ID from the input,
    // as that could potentially belong to a different account if this is a new login action.
    const accountId = await this.cookieStore.get(cookie);

    // Only refresh the cookie if it points to an account that exists and wants to be remembered
    if (!accountId) {
      return output;
    }
    const setting = await this.accountStore.getSetting(accountId, ACCOUNT_SETTINGS_REMEMBER_LOGIN);
    if (!setting) {
      return output;
    }

    // Refresh the cookie, could be undefined if it was deleted by the operation
    const expiration = await this.cookieStore.refresh(cookie);
    if (expiration) {
      outputMetadata = outputMetadata ?? new RepresentationMetadata(input.target);
      outputMetadata.set(SOLID_HTTP.terms.accountCookie, cookie);
      outputMetadata.set(SOLID_HTTP.terms.accountCookieExpiration, expiration.toISOString());
      output.metadata = outputMetadata;
    }

    return output;
  }
}
