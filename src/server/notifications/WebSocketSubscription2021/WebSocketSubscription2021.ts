import type { Store } from 'n3';
import type { Credentials } from '../../../authentication/Credentials';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { NOTIFY } from '../../../util/Vocabularies';
import { BaseChannelType } from '../BaseChannelType';
import type { NotificationChannel } from '../NotificationChannel';
import { generateWebSocketUrl } from './WebSocket2021Util';

/**
 * A {@link NotificationChannel} containing the necessary fields for a WebSocketSubscription2021 channel.
 */
export interface WebSocketSubscription2021Channel extends NotificationChannel {
  /**
   * The "notify:WebSocketSubscription2021" type.
   */
  type: typeof NOTIFY.WebSocketSubscription2021;
  /**
   * The WebSocket through which the channel will send notifications.
   */
  source: string;
}

export function isWebSocket2021Channel(channel: NotificationChannel): channel is WebSocketSubscription2021Channel {
  return channel.type === NOTIFY.WebSocketSubscription2021;
}

/**
 * The notification channel type WebSocketSubscription2021 as described in
 * https://solidproject.org/TR/websocket-subscription-2021
 *
 * Requires read permissions on a resource to be able to receive notifications.
 */
export class WebSocketSubscription2021 extends BaseChannelType {
  protected readonly logger = getLoggerFor(this);

  private readonly path: string;

  public constructor(route: InteractionRoute) {
    super(NOTIFY.terms.WebSocketSubscription2021);
    this.path = route.getPath();
  }

  public async initChannel(data: Store, credentials: Credentials): Promise<WebSocketSubscription2021Channel> {
    const channel = await super.initChannel(data, credentials);
    return {
      ...channel,
      type: NOTIFY.WebSocketSubscription2021,
      source: generateWebSocketUrl(this.path, channel.id),
    };
  }
}
