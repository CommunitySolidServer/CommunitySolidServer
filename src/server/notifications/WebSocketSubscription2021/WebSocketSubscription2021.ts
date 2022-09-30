import { string } from 'yup';
import type { AccessMap } from '../../../authorization/permissions/Permissions';
import { AccessMode } from '../../../authorization/permissions/Permissions';
import { BasicRepresentation } from '../../../http/representation/BasicRepresentation';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { APPLICATION_LD_JSON } from '../../../util/ContentTypes';
import { IdentifierSetMultiMap } from '../../../util/map/IdentifierMap';
import { CONTEXT_NOTIFICATION } from '../Notification';
import type { Subscription } from '../Subscription';
import { SUBSCRIBE_SCHEMA } from '../Subscription';
import type { SubscriptionStorage } from '../SubscriptionStorage';
import type { SubscriptionResponse, SubscriptionType } from '../SubscriptionType';

const type = 'WebSocketSubscription2021';
const schema = SUBSCRIBE_SCHEMA.shape({
  type: string().required().oneOf([ type ]),
});

/**
 * The notification subscription type WebSocketSubscription2021 as described in
 * https://solidproject.org/TR/websocket-subscription-2021
 *
 * Requires read permissions on a resource to be able to receive notifications.
 */
export class WebSocketSubscription2021 implements SubscriptionType<typeof schema> {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: SubscriptionStorage;
  private readonly path: string;

  public readonly type = type;
  public readonly schema = schema;

  public constructor(storage: SubscriptionStorage, route: InteractionRoute) {
    this.storage = storage;
    this.path = route.getPath();
  }

  public async extractModes(subscription: Subscription): Promise<AccessMap> {
    return new IdentifierSetMultiMap<AccessMode>([[{ path: subscription.topic }, AccessMode.read ]]);
  }

  public async subscribe(subscription: Subscription): Promise<SubscriptionResponse> {
    const info = this.storage.create(subscription, {});
    await this.storage.add(info);

    const jsonld = {
      '@context': [ CONTEXT_NOTIFICATION ],
      type: this.type,
      source: `ws${this.path.slice('http'.length)}?auth=${encodeURI(info.id)}`,
    };
    const response = new BasicRepresentation(JSON.stringify(jsonld), APPLICATION_LD_JSON);

    return { response, info };
  }
}
