import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { Account } from './util/Account';
import type { AccountStore } from './util/AccountStore';
import { getRequiredAccount } from './util/AccountUtil';

/**
 * Outputs a JSON description of the account details.
 */
export class AccountDetailsHandler extends JsonInteractionHandler<Account> {
  private readonly accountStore: AccountStore;

  public constructor(accountStore: AccountStore) {
    super();
    this.accountStore = accountStore;
  }

  public async handle({ accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<Account>> {
    const account = await getRequiredAccount(this.accountStore, accountId);
    return { json: account };
  }
}
