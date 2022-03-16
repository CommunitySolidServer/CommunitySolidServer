import type { AccountIdKey, AccountIdRoute } from '../../account/AccountIdRoute';
import { IdInteractionRoute } from '../../routing/IdInteractionRoute';
import type { ExtendedRoute } from '../../routing/InteractionRoute';

export type CredentialsIdKey = 'clientCredentialsId';

/**
 * An {@link AccountIdRoute} that also includes a credentials identifier.
 */
export type ClientCredentialsIdRoute = ExtendedRoute<AccountIdRoute, CredentialsIdKey>;

/**
 * Implementation of an {@link ClientCredentialsIdRoute}
 * that adds the identifier relative to a base {@link AccountIdRoute}.
 */
export class BaseClientCredentialsIdRoute extends IdInteractionRoute<AccountIdKey, CredentialsIdKey> {
  public constructor(base: AccountIdRoute) {
    super(base, 'clientCredentialsId');
  }
}
