import type { EmptyObject } from '../../../util/map/MapUtil';
import { parsePath, verifyAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { WebIdStore } from './util/WebIdStore';
import type { WebIdLinkRoute } from './WebIdLinkRoute';

/**
 * Allows users to remove WebIDs linked to their account.
 */
export class UnlinkWebIdHandler extends JsonInteractionHandler<EmptyObject> {
  private readonly webIdStore: WebIdStore;
  private readonly webIdRoute: WebIdLinkRoute;

  public constructor(webIdStore: WebIdStore, webIdRoute: WebIdLinkRoute) {
    super();
    this.webIdStore = webIdStore;
    this.webIdRoute = webIdRoute;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const match = parsePath(this.webIdRoute, target.path);

    const link = await this.webIdStore.get(match.webIdLink);
    verifyAccountId(accountId, link?.accountId);

    await this.webIdStore.delete(match.webIdLink);

    return { json: {}};
  }
}
