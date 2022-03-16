import type { AccountIdKey, AccountIdRoute } from '../account/AccountIdRoute';
import { IdInteractionRoute } from '../routing/IdInteractionRoute';
import type { ExtendedRoute } from '../routing/InteractionRoute';

export type PodIdKey = 'podId';

/**
 * An {@link AccountIdRoute} that also includes a pod identifier.
 */
export type PodIdRoute = ExtendedRoute<AccountIdRoute, PodIdKey>;

/**
 * Implementation of an {@link PodIdRoute} that adds the identifier relative to a base {@link AccountIdRoute}.
 */
export class BasePodIdRoute extends IdInteractionRoute<AccountIdKey, PodIdKey> {
  public constructor(base: AccountIdRoute) {
    super(base, 'podId');
  }
}
