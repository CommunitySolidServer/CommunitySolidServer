import type { EmptyObject } from '../../../util/map/MapUtil';
import type { AccountStore } from '../account/util/AccountStore';
import { ensureResource, getRequiredAccount } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { ClientCredentialsStore } from './util/ClientCredentialsStore';

/**
 * Handles the deletion of client credentials tokens.
 */
export class DeleteClientCredentialsHandler extends JsonInteractionHandler<EmptyObject> {
  private readonly accountStore: AccountStore;
  private readonly clientCredentialsStore: ClientCredentialsStore;

  public constructor(accountStore: AccountStore, clientCredentialsStore: ClientCredentialsStore) {
    super();
    this.accountStore = accountStore;
    this.clientCredentialsStore = clientCredentialsStore;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const account = await getRequiredAccount(this.accountStore, accountId);

    const id = ensureResource(account.clientCredentials, target.path);

    // This also deletes it from the account
    await this.clientCredentialsStore.delete(id, account);

    return { json: {}};
  }
}
