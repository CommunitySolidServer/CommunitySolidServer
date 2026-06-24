import type { AccountIdKey, AccountIdRoute } from '../../account/AccountIdRoute';
import { IdInteractionRoute } from '../../routing/IdInteractionRoute';
import type { ExtendedRoute } from '../../routing/InteractionRoute';

export type AssertionsIdKey = 'jwtAssertionsId';

/**
 * An {@link AccountIdRoute} that also includes a credentials identifier.
 */
export type JwtAssertionsIdRoute = ExtendedRoute<AccountIdRoute, AssertionsIdKey>;

/**
 * Implementation of an {@link JwtAssertionsIdRoute}
 * that adds the identifier relative to a base {@link AccountIdRoute}.
 */
export class BaseJwtAssertionsIdRoute extends IdInteractionRoute<AccountIdKey, AssertionsIdKey> {
  public constructor(base: AccountIdRoute) {
    super(base, 'jwtAssertionsId');
  }
}
