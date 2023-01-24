import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { WebSocketServerConfigurator } from '../../WebSocketServerConfigurator';
import type { NotificationChannelStorage } from '../NotificationChannelStorage';
import type { WebSocket2021Handler } from './WebSocket2021Handler';
import { parseWebSocketRequest } from './WebSocket2021Util';

/**
 * Listens for WebSocket connections and verifies if they are valid WebSocketSubscription2021 connections,
 * in which case its {@link WebSocket2021Handler} will be alerted.
 */
export class WebSocket2021Listener extends WebSocketServerConfigurator {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: NotificationChannelStorage;
  private readonly handler: WebSocket2021Handler;
  private readonly path: string;

  public constructor(storage: NotificationChannelStorage, handler: WebSocket2021Handler, route: InteractionRoute) {
    super();
    this.storage = storage;
    this.handler = handler;
    this.path = new URL(route.getPath()).pathname;
  }

  protected async handleConnection(webSocket: WebSocket, upgradeRequest: IncomingMessage): Promise<void> {
    const { path, id } = parseWebSocketRequest(upgradeRequest);

    if (path !== this.path) {
      webSocket.send('Unknown WebSocket target.');
      return webSocket.close();
    }

    if (!id) {
      webSocket.send('Missing auth parameter from WebSocket URL.');
      return webSocket.close();
    }

    const info = await this.storage.get(id);

    if (!info) {
      // Info not being there implies it has expired
      webSocket.send(`Notification channel has expired`);
      return webSocket.close();
    }

    this.logger.info(`Accepted WebSocket connection listening to changes on ${info.topic}`);

    await this.handler.handleSafe({ info, webSocket });
  }
}
