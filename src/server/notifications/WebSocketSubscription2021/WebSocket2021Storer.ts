import type { WebSocket } from 'ws';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { SetMultiMap } from '../../../util/map/SetMultiMap';
import { setSafeInterval } from '../../../util/TimerUtil';
import type { NotificationChannelStorage } from '../NotificationChannelStorage';
import type { WebSocket2021HandlerInput } from './WebSocket2021Handler';
import { WebSocket2021Handler } from './WebSocket2021Handler';

/**
 * Keeps track of the WebSockets that were opened for a WebSocketSubscription2021 channel.
 * The WebSockets are stored in the map using the identifier of the matching channel.
 *
 * `cleanupTimer` defines in minutes how often the stored WebSockets are closed
 * if their corresponding channel has expired.
 * Defaults to 60 minutes.
 * Open WebSockets will not receive notifications if their channel expired.
 */
export class WebSocket2021Storer extends WebSocket2021Handler {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: NotificationChannelStorage;
  private readonly socketMap: SetMultiMap<string, WebSocket>;

  public constructor(storage: NotificationChannelStorage, socketMap: SetMultiMap<string, WebSocket>,
    cleanupTimer = 60) {
    super();
    this.socketMap = socketMap;
    this.storage = storage;

    const timer = setSafeInterval(this.logger,
      'Failed to remove closed WebSockets',
      this.closeExpiredSockets.bind(this),
      cleanupTimer * 60 * 1000);
    timer.unref();
  }

  public async handle({ webSocket, info }: WebSocket2021HandlerInput): Promise<void> {
    this.socketMap.add(info.id, webSocket);
    webSocket.on('error', (): boolean => this.socketMap.deleteEntry(info.id, webSocket));
    webSocket.on('close', (): boolean => this.socketMap.deleteEntry(info.id, webSocket));
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
          // Due to the attached listener this also deletes the entries
          socket.close();
        }
      }
    }
    this.logger.debug('Finished closing expired WebSockets');
  }
}
