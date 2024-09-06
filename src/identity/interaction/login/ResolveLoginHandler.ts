import { RepresentationMetadata } from '../../../http/representation/RepresentationMetadata';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { Json } from '../../../util/Json';
import { SOLID_HTTP } from '../../../util/Vocabularies';
import { ACCOUNT_SETTINGS_REMEMBER_LOGIN } from '../account/util/AccountStore';
import type { AccountStore } from '../account/util/AccountStore';
import type { CookieStore } from '../account/util/CookieStore';
import type { JsonRepresentation } from '../InteractionUtil';
import { finishInteraction } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';

/**
 * Output type that is expected of handlers logging an account in.
 */
export type LoginOutputType = {
  /**
   * The ID of the account that logged in.
   */
  accountId: string;
  /**
   * If this account should be remembered or not.
   * Setting this to `undefined` will keep the setting as it currently is.
   */
  remember?: boolean;
};

/**
 * A handler that takes care of all the necessary steps when logging a user in,
 * such as generating a cookie and setting the necessary OIDC information.
 * Classes that resolve login methods should extend this class and implement the `login` method.
 */
export abstract class ResolveLoginHandler extends JsonInteractionHandler {
  protected readonly logger = getLoggerFor(this);

  protected readonly accountStore: AccountStore;
  protected readonly cookieStore: CookieStore;

  protected constructor(accountStore: AccountStore, cookieStore: CookieStore) {
    super();
    this.accountStore = accountStore;
    this.cookieStore = cookieStore;
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    const result = await this.login(input);
    const { accountId, remember } = result.json;

    const json: Json = { ...result.json };

    // There is no need to output these fields in the response JSON
    delete json.accountId;
    delete json.remember;

    // The cookie that is used to identify that a user has logged in.
    // Putting it in the metadata, so it can be converted into an HTTP response header.
    // Putting it in the response JSON so users can also use it in an Authorization header.
    const metadata = result.metadata ?? new RepresentationMetadata(input.target);
    json.authorization = await this.cookieStore.generate(accountId);
    metadata.add(SOLID_HTTP.terms.accountCookie, json.authorization);

    // Delete the old cookie if there was one, to prevent unused cookies from being stored.
    // We are not reusing this cookie as it could be associated with a different account.
    const oldCookie = input.metadata.get(SOLID_HTTP.terms.accountCookie)?.value;
    if (oldCookie) {
      this.logger.debug(`Replacing old cookie ${oldCookie} with ${json.cookie as string}`);
      await this.cookieStore.delete(oldCookie);
    }

    // Update the account settings
    await this.updateRememberSetting(accountId, remember);

    // Not throwing redirect error otherwise the cookie metadata would be lost.
    // See {@link LocationInteractionHandler} why this field is added.
    if (input.oidcInteraction) {
      // Finish the interaction so the policies are checked again, where they will find the new cookie
      json.location = await finishInteraction(input.oidcInteraction, {}, true);
    }

    return { json, metadata };
  }

  /**
   * Updates the account setting that determines whether the login status needs to be remembered.
   *
   * @param accountId - ID of the account.
   * @param remember - If the account should be remembered or not. The setting will not be updated if this is undefined.
   */
  protected async updateRememberSetting(accountId: string, remember?: boolean): Promise<void> {
    if (typeof remember === 'boolean') {
      // Store the setting indicating if the user wants the cookie to persist
      await this.accountStore.updateSetting(accountId, ACCOUNT_SETTINGS_REMEMBER_LOGIN, remember);
      this.logger.debug(`Updating account remember setting to ${remember}`);
    }
  }

  /**
   * Takes the necessary steps to log a user in.
   *
   * @param input - Same input that was passed to the handle function.
   */
  public abstract login(input: JsonInteractionHandlerInput): Promise<JsonRepresentation<LoginOutputType>>;
}
