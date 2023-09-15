import type { EmptyObject } from '../../../util/map/MapUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonView } from '../JsonView';
import type { LoginOutputType } from '../login/ResolveLoginHandler';
import { ResolveLoginHandler } from '../login/ResolveLoginHandler';
import type { AccountStore } from './util/AccountStore';
import type { CookieStore } from './util/CookieStore';

/**
 * Creates new accounts using an {@link AccountStore};
 */
export class CreateAccountHandler extends ResolveLoginHandler implements JsonView {
  public constructor(accountStore: AccountStore, cookieStore: CookieStore) {
    super(accountStore, cookieStore);
  }

  public async getView(): Promise<JsonRepresentation<EmptyObject>> {
    return { json: {}};
  }

  public async login(): Promise<JsonRepresentation<LoginOutputType>> {
    const accountId = await this.accountStore.create();

    return { json: { accountId }};
  }
}
