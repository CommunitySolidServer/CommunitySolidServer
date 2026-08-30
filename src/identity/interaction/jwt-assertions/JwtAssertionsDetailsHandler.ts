import { getLoggerFor } from '../../../logging/LogUtil';
import { parsePath, verifyAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JwtAssertionsIdRoute } from './util/JwtAssertionsIdRoute';
import type { JwtAssertionsStore } from './util/JwtAssertionsStore';

type OutType = {
  id: string;
  webId: string;
};

/**
 * Provides a view on a client credentials token, indicating the token identifier and its associated WebID.
 */
export class JwtAssertionsDetailsHandler extends JsonInteractionHandler<OutType> {
  protected readonly logger = getLoggerFor(this);

  private readonly jwtAssertionsStore: JwtAssertionsStore;
  private readonly jwtAssertionsRoute: JwtAssertionsIdRoute;

  public constructor(jwtAssertionsStore: JwtAssertionsStore, jwtAssertionsRoute: JwtAssertionsIdRoute) {
    super();
    this.jwtAssertionsStore = jwtAssertionsStore;
    this.jwtAssertionsRoute = jwtAssertionsRoute;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    const match = parsePath(this.jwtAssertionsRoute, target.path);

    const credentials = await this.jwtAssertionsStore.get(match.jwtAssertionsId);
    verifyAccountId(accountId, credentials?.accountId);

    return { json: {
      id: credentials.client,
      webId: credentials.agent,
    }};
  }
}
