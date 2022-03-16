import type { EmptyObject } from '../../../util/map/MapUtil';
import type { AccountStore } from '../account/util/AccountStore';
import { ensureResource, getRequiredAccount } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { WebIdStore } from './util/WebIdStore';

/**
 * Allows users to remove WebIDs linked to their account.
 */
export class UnlinkWebIdHandler extends JsonInteractionHandler<EmptyObject> {
  private readonly accountStore: AccountStore;
  private readonly webIdStore: WebIdStore;

  public constructor(accountStore: AccountStore, webIdStore: WebIdStore) {
    super();
    this.accountStore = accountStore;
    this.webIdStore = webIdStore;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const account = await getRequiredAccount(this.accountStore, accountId);

    const webId = ensureResource(account.webIds, target.path);

    // This also deletes it from the account
    await this.webIdStore.delete(webId, account);

    return { json: {}};
  }
}
