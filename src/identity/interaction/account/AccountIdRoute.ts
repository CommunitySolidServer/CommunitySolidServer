import { IdInteractionRoute } from '../routing/IdInteractionRoute';
import type { InteractionRoute } from '../routing/InteractionRoute';

// AccountIdKey = typeof ACCOUNT_ID_KEY does not work because Components.js doesn't support typeof like that

export type AccountIdKey = 'accountId';
export const ACCOUNT_ID_KEY: AccountIdKey = 'accountId';

/**
 * A route that includes an account identifier.
 */
export type AccountIdRoute = InteractionRoute<AccountIdKey>;

/**
 * Implementation of an {@link AccountIdRoute} that adds the identifier relative to a base {@link InteractionRoute}.
 */
export class BaseAccountIdRoute extends IdInteractionRoute<never, AccountIdKey> implements AccountIdRoute {
  public constructor(base: InteractionRoute) {
    super(base, 'accountId');
  }
}
