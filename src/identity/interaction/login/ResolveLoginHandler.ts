import { RepresentationMetadata } from '../../../http/representation/RepresentationMetadata';
import { getLoggerFor } from '../../../logging/LogUtil';
import { SOLID_HTTP } from '../../../util/Vocabularies';
import type { AccountIdRoute } from '../account/AccountIdRoute';
import type { CookieStore } from '../account/util/CookieStore';
import type { Json, JsonRepresentation } from '../InteractionUtil';
import { ACCOUNT_PROMPT, finishInteraction } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';

export type LoginOutputType = { accountId: string };

/**
 * A handler that takes care of all the necessary steps when logging a user in,
 * such as generating a cookie and setting the necessary OIDC information.
 * Classes that resolve login methods should extend this class and implement the `login` method.
 */
export abstract class ResolveLoginHandler extends JsonInteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly cookieStore: CookieStore;
  private readonly accountRoute: AccountIdRoute;

  protected constructor(cookieStore: CookieStore, accountRoute: AccountIdRoute) {
    super();
    this.cookieStore = cookieStore;
    this.accountRoute = accountRoute;
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    const result = await this.login(input);
    const { accountId } = result.json;

    const json: Json = {
      ...result.json,
      resource: this.accountRoute.getPath({ accountId }),
    };

    // There is no need to output this field in the API
    delete json.accountId;

    // Not throwing redirect error since we also want to add the cookie metadata.
    // See {@link LocationInteractionHandler} why this field is added.
    if (input.oidcInteraction) {
      json.location = await finishInteraction(input.oidcInteraction, { [ACCOUNT_PROMPT]: accountId }, true);
    }

    // The cookie that is used to identify that a user has logged in.
    // Putting it in the metadata, so it can be converted into an HTTP response header.
    // Putting it in the response JSON so users can also use it in an Authorization header.
    const cookie = await this.cookieStore.generate(accountId);
    const metadata = result.metadata ?? new RepresentationMetadata(input.target);
    metadata.add(SOLID_HTTP.terms.accountCookie, cookie);
    json.cookie = cookie;

    return { json, metadata };
  }

  /**
   * Takes the necessary steps to log a user in.
   * @param input - Same input that was passed to the handle function.
   */
  public abstract login(input: JsonInteractionHandlerInput): Promise<JsonRepresentation<LoginOutputType>>;
}
