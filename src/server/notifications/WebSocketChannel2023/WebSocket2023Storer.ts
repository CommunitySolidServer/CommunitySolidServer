import type { WebSocket } from 'ws';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { SetMultiMap } from '../../../util/map/SetMultiMap';
import { setSafeInterval } from '../../../util/TimerUtil';
import type { NotificationChannelStorage } from '../NotificationChannelStorage';
import type { WebSocket2023HandlerInput } from './WebSocket2023Handler';
import { WebSocket2023Handler } from './WebSocket2023Handler';

/**
 * Keeps track of the WebSockets that were opened for a WebSocketChannel2023 channel.
 * The WebSockets are stored in the map using the identifier of the matching channel.
 *
 * `cleanupTimer` defines in minutes how often the stored WebSockets are closed
 * if their corresponding channel has expired.
 * Defaults to 60 minutes.
 * Open WebSockets will not receive notifications if their channel expired.
 */
export class WebSocket2023Storer extends WebSocket2023Handler {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: NotificationChannelStorage;
  private readonly socketMap: SetMultiMap<string, WebSocket>;

  public constructor(
    storage: NotificationChannelStorage,
    socketMap: SetMultiMap<string, WebSocket>,
    cleanupTimer = 60,
  ) {
    super();
    this.socketMap = socketMap;
    this.storage = storage;

    const timer = setSafeInterval(
      this.logger,
      'Failed to remove closed WebSockets',
      this.closeExpiredSockets.bind(this),
      cleanupTimer * 60 * 1000,
    );
    timer.unref();
  }

  public async handle({ webSocket, channel }: WebSocket2023HandlerInput): Promise<void> {
    this.socketMap.add(channel.id, webSocket);
    webSocket.on('error', (): boolean => this.socketMap.deleteEntry(channel.id, webSocket));
    webSocket.on('close', (): boolean => this.socketMap.deleteEntry(channel.id, webSocket));
  }

  /**
   * Close all WebSockets that are attached to a channel that no longer exists.
   */
  private async closeExpiredSockets(): Promise<void> {
    this.logger.debug('Closing expired WebSockets');
    for (const [ id, sockets ] of this.socketMap.entrySets()) {
      const result = await this.storage.get(id);
      if (!result) {
        for (const socket of sockets) {
          // Due to the attached listener, this also deletes the entries in the `socketMap`
          socket.send(`Notification channel has expired`);
          socket.close();
        }
      }
    }
    this.logger.debug('Finished closing expired WebSockets');
  }
}
