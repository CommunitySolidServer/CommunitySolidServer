import { getLoggerFor } from '../../../logging/LogUtil';
import { parsePath, verifyAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { ClientCredentialsIdRoute } from './util/ClientCredentialsIdRoute';
import type { ClientCredentialsStore } from './util/ClientCredentialsStore';

type OutType = {
  id: string;
  webId: string;
};

/**
 * Provides a view on a client credentials token, indicating the token identifier and its associated WebID.
 */
export class ClientCredentialsDetailsHandler extends JsonInteractionHandler<OutType> {
  protected readonly logger = getLoggerFor(this);

  private readonly clientCredentialsStore: ClientCredentialsStore;
  private readonly clientCredentialsRoute: ClientCredentialsIdRoute;

  public constructor(clientCredentialsStore: ClientCredentialsStore, clientCredentialsRoute: ClientCredentialsIdRoute) {
    super();
    this.clientCredentialsStore = clientCredentialsStore;
    this.clientCredentialsRoute = clientCredentialsRoute;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    const match = parsePath(this.clientCredentialsRoute, target.path);

    const credentials = await this.clientCredentialsStore.get(match.clientCredentialsId);
    verifyAccountId(accountId, credentials?.accountId);

    return { json: {
      id: credentials.label,
      webId: credentials.webId,
    }};
  }
}
