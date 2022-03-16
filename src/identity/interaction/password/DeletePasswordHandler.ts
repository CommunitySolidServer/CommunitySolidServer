import { NotFoundHttpError } from '../../../util/errors/NotFoundHttpError';
import type { EmptyObject } from '../../../util/map/MapUtil';
import type { AccountStore } from '../account/util/AccountStore';
import { ensureResource, getRequiredAccount, safeUpdate } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import { PASSWORD_METHOD } from './util/PasswordStore';
import type { PasswordStore } from './util/PasswordStore';

/**
 * Handles the deletion of a password login method.
 */
export class DeletePasswordHandler extends JsonInteractionHandler<EmptyObject> {
  private readonly accountStore: AccountStore;
  private readonly passwordStore: PasswordStore;

  public constructor(accountStore: AccountStore, passwordStore: PasswordStore) {
    super();
    this.accountStore = accountStore;
    this.passwordStore = passwordStore;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const account = await getRequiredAccount(this.accountStore, accountId);

    const passwordLogins = account.logins[PASSWORD_METHOD];
    if (!passwordLogins) {
      throw new NotFoundHttpError();
    }

    const email = ensureResource(passwordLogins, target.path);

    // This needs to happen first since this checks that there is at least 1 login method
    delete passwordLogins[email];

    // Delete the password data and revert if something goes wrong
    await safeUpdate(account,
      this.accountStore,
      (): Promise<any> => this.passwordStore.delete(email));

    return { json: {}};
  }
}
