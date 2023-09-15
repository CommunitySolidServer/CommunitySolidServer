import type { EmptyObject } from '../../../util/map/MapUtil';
import { parsePath, verifyAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { ClientCredentialsIdRoute } from './util/ClientCredentialsIdRoute';
import type { ClientCredentialsStore } from './util/ClientCredentialsStore';

/**
 * Handles the deletion of client credentials tokens.
 */
export class DeleteClientCredentialsHandler extends JsonInteractionHandler<EmptyObject> {
  private readonly clientCredentialsStore: ClientCredentialsStore;
  private readonly clientCredentialsRoute: ClientCredentialsIdRoute;

  public constructor(clientCredentialsStore: ClientCredentialsStore, clientCredentialsRoute: ClientCredentialsIdRoute) {
    super();
    this.clientCredentialsStore = clientCredentialsStore;
    this.clientCredentialsRoute = clientCredentialsRoute;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const match = parsePath(this.clientCredentialsRoute, target.path);

    const credentials = await this.clientCredentialsStore.get(match.clientCredentialsId);
    verifyAccountId(accountId, credentials?.accountId);

    await this.clientCredentialsStore.delete(match.clientCredentialsId);

    return { json: {}};
  }
}
