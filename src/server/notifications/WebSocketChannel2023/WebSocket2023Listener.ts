import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';
import { getLoggerFor } from '../../../logging/LogUtil';
import { WebSocketServerConfigurator } from '../../WebSocketServerConfigurator';
import type { NotificationChannelStorage } from '../NotificationChannelStorage';
import type { WebSocket2023Handler } from './WebSocket2023Handler';
import { parseWebSocketRequest } from './WebSocket2023Util';

/**
 * Listens for WebSocket connections and verifies if they are valid WebSocketChannel2023 connections,
 * in which case its {@link WebSocket2023Handler} will be alerted.
 */
export class WebSocket2023Listener extends WebSocketServerConfigurator {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: NotificationChannelStorage;
  private readonly handler: WebSocket2023Handler;
  private readonly baseUrl: string;

  public constructor(storage: NotificationChannelStorage, handler: WebSocket2023Handler, baseUrl: string) {
    super();
    this.storage = storage;
    this.handler = handler;
    this.baseUrl = baseUrl;
  }

  protected async handleConnection(webSocket: WebSocket, upgradeRequest: IncomingMessage): Promise<void> {
    const id = parseWebSocketRequest(this.baseUrl, upgradeRequest);

    const channel = await this.storage.get(id);

    if (!channel) {
      // Channel not being there implies it has expired
      webSocket.send(`Notification channel has expired`);
      return webSocket.close();
    }

    this.logger.info(`Accepted WebSocket connection listening to changes on ${channel.topic}`);

    await this.handler.handleSafe({ channel, webSocket });
  }
}
