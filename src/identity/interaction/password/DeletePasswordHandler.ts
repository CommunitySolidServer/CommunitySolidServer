import type { EmptyObject } from '../../../util/map/MapUtil';
import { parsePath, verifyAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { PasswordIdRoute } from './util/PasswordIdRoute';
import type { PasswordStore } from './util/PasswordStore';

/**
 * Handles the deletion of a password login method.
 */
export class DeletePasswordHandler extends JsonInteractionHandler<EmptyObject> {
  private readonly passwordStore: PasswordStore;
  private readonly passwordRoute: PasswordIdRoute;

  public constructor(passwordStore: PasswordStore, passwordRoute: PasswordIdRoute) {
    super();
    this.passwordStore = passwordStore;
    this.passwordRoute = passwordRoute;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const match = parsePath(this.passwordRoute, target.path);

    const login = await this.passwordStore.get(match.passwordId);
    verifyAccountId(accountId, login?.accountId);

    await this.passwordStore.delete(match.passwordId);

    return { json: {}};
  }
}
