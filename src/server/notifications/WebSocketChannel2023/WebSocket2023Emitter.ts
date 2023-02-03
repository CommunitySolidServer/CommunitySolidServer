import type { WebSocket } from 'ws';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { SetMultiMap } from '../../../util/map/SetMultiMap';
import { readableToString } from '../../../util/StreamUtil';
import { NotificationEmitter } from '../NotificationEmitter';
import type { NotificationEmitterInput } from '../NotificationEmitter';

/**
 * Emits notifications on WebSocketChannel2023 subscription.
 * Uses the WebSockets found in the provided map.
 * The key should be the identifier of the matching channel.
 */
export class WebSocket2023Emitter extends NotificationEmitter {
  protected readonly logger = getLoggerFor(this);

  private readonly socketMap: SetMultiMap<string, WebSocket>;

  public constructor(socketMap: SetMultiMap<string, WebSocket>) {
    super();

    this.socketMap = socketMap;
  }

  public async handle({ channel, representation }: NotificationEmitterInput): Promise<void> {
    // Called as a NotificationEmitter: emit the notification
    const webSockets = this.socketMap.get(channel.id);
    if (webSockets) {
      const data = await readableToString(representation.data);
      for (const webSocket of webSockets) {
        webSocket.send(data);
      }
    } else {
      representation.data.destroy();
    }
  }
}
