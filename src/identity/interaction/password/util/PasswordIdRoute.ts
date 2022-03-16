import type { AccountIdKey, AccountIdRoute } from '../../account/AccountIdRoute';
import { IdInteractionRoute } from '../../routing/IdInteractionRoute';
import type { ExtendedRoute } from '../../routing/InteractionRoute';

export type PasswordIdKey = 'passwordId';

/**
 * An {@link AccountIdRoute} that also includes a password login identifier.
 */
export type PasswordIdRoute = ExtendedRoute<AccountIdRoute, PasswordIdKey>;

/**
 * Implementation of an {@link PasswordIdRoute} that adds the identifier relative to a base {@link AccountIdRoute}.
 */
export class BasePasswordIdRoute extends IdInteractionRoute<AccountIdKey, PasswordIdKey> {
  public constructor(base: AccountIdRoute) {
    super(base, 'passwordId');
  }
}
