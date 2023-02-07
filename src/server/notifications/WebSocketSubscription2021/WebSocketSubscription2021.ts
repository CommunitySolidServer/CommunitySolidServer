import { string } from 'yup';
import type { AccessMap } from '../../../authorization/permissions/Permissions';
import { AccessMode } from '../../../authorization/permissions/Permissions';
import { BasicRepresentation } from '../../../http/representation/BasicRepresentation';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { APPLICATION_LD_JSON } from '../../../util/ContentTypes';
import { IdentifierSetMultiMap } from '../../../util/map/IdentifierMap';
import { CONTEXT_NOTIFICATION } from '../Notification';
import type { NotificationChannelJson } from '../NotificationChannel';
import { NOTIFICATION_CHANNEL_SCHEMA } from '../NotificationChannel';
import type { NotificationChannelStorage } from '../NotificationChannelStorage';
import type { NotificationChannelResponse, NotificationChannelType } from '../NotificationChannelType';
import { generateWebSocketUrl } from './WebSocket2021Util';

const type = 'WebSocketSubscription2021';
const schema = NOTIFICATION_CHANNEL_SCHEMA.shape({
  type: string().required().oneOf([ type ]),
});

/**
 * The notification channel type WebSocketSubscription2021 as described in
 * https://solidproject.org/TR/websocket-subscription-2021
 *
 * Requires read permissions on a resource to be able to receive notifications.
 */
export class WebSocketSubscription2021 implements NotificationChannelType<typeof schema> {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: NotificationChannelStorage;
  private readonly path: string;

  public readonly type = type;
  public readonly schema = schema;

  public constructor(storage: NotificationChannelStorage, route: InteractionRoute) {
    this.storage = storage;
    this.path = route.getPath();
  }

  public async extractModes(json: NotificationChannelJson): Promise<AccessMap> {
    return new IdentifierSetMultiMap<AccessMode>([[{ path: json.topic }, AccessMode.read ]]);
  }

  public async subscribe(json: NotificationChannelJson): Promise<NotificationChannelResponse> {
    const channel = this.storage.create(json, {});
    await this.storage.add(channel);

    const jsonld = {
      '@context': [ CONTEXT_NOTIFICATION ],
      type: this.type,
      source: generateWebSocketUrl(this.path, channel.id),
    };
    const response = new BasicRepresentation(JSON.stringify(jsonld), APPLICATION_LD_JSON);

    return { response, channel };
  }
}
