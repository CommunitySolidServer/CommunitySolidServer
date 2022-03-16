import type { AccountIdKey, AccountIdRoute } from '../account/AccountIdRoute';
import { IdInteractionRoute } from '../routing/IdInteractionRoute';
import type { ExtendedRoute } from '../routing/InteractionRoute';

export type WebIdLinkKey = 'webIdLink';

/**
 * An {@link AccountIdRoute} that also includes a Web ID link identifier.
 */
export type WebIdLinkRoute = ExtendedRoute<AccountIdRoute, WebIdLinkKey>;

/**
 * Implementation of an {@link WebIdLinkRoute} that adds the identifier relative to a base {@link AccountIdRoute}.
 */
export class BaseWebIdLinkRoute extends IdInteractionRoute<AccountIdKey, WebIdLinkKey> {
  public constructor(base: AccountIdRoute) {
    super(base, 'webIdLink');
  }
}
