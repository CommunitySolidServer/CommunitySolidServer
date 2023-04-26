import { getLoggerFor } from '../../../logging/LogUtil';
import { NotImplementedHttpError } from '../../../util/errors/NotImplementedHttpError';
import type { WebSocketHandlerInput } from '../../WebSocketHandler';
import { WebSocketHandler } from '../../WebSocketHandler';
import type { NotificationChannelStorage } from '../NotificationChannelStorage';
import type { WebSocket2023Handler } from './WebSocket2023Handler';
import { parseWebSocketRequest } from './WebSocket2023Util';

/**
 * Listens for WebSocket connections and verifies whether they are valid WebSocketChannel2023 connections,
 * in which case its {@link WebSocket2023Handler} will be alerted.
 */
export class WebSocket2023Listener extends WebSocketHandler {
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

  public async canHandle({ upgradeRequest }: WebSocketHandlerInput): Promise<void> {
    const id = parseWebSocketRequest(this.baseUrl, upgradeRequest);
    const channel = await this.storage.get(id);

    if (!channel) {
      throw new NotImplementedHttpError(`Unknown or expired WebSocket channel ${id}`);
    }
  }

  public async handle({ webSocket, upgradeRequest }: WebSocketHandlerInput): Promise<void> {
    const id = parseWebSocketRequest(this.baseUrl, upgradeRequest);
    const channel = (await this.storage.get(id))!;

    this.logger.info(`Accepted WebSocket connection listening to changes on ${channel.topic}`);

    await this.handler.handleSafe({ channel, webSocket });
  }
}
