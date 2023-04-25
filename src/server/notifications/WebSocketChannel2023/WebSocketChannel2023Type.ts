import type { Store } from 'n3';
import type { Credentials } from '../../../authentication/Credentials';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { NOTIFY } from '../../../util/Vocabularies';
import { BaseChannelType } from '../BaseChannelType';
import type { NotificationChannel } from '../NotificationChannel';
import { generateWebSocketUrl } from './WebSocket2023Util';

/**
 * A {@link NotificationChannel} containing the necessary fields for a WebSocketChannel2023 channel.
 */
export interface WebSocketChannel2023 extends NotificationChannel {
  /**
   * The "notify:WebSocketChannel2023" type.
   */
  type: typeof NOTIFY.WebSocketChannel2023;
  /**
   * The WebSocket through which the channel will send notifications.
   */
  receiveFrom: string;
}

export function isWebSocket2023Channel(channel: NotificationChannel): channel is WebSocketChannel2023 {
  return channel.type === NOTIFY.WebSocketChannel2023;
}

/**
 * The notification channel type WebSocketChannel2023 as described in
 * https://solid.github.io/notifications/websocket-channel-2023
 *
 * Requires read permissions on a resource to be able to receive notifications.
 */
export class WebSocketChannel2023Type extends BaseChannelType {
  protected readonly logger = getLoggerFor(this);

  public constructor(route: InteractionRoute, features?: string[]) {
    super(NOTIFY.terms.WebSocketChannel2023, route, features);
  }

  public async initChannel(data: Store, credentials: Credentials): Promise<WebSocketChannel2023> {
    const channel = await super.initChannel(data, credentials);
    return {
      ...channel,
      type: NOTIFY.WebSocketChannel2023,
      receiveFrom: generateWebSocketUrl(channel.id),
    };
  }
}
