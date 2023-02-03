import type { WebSocket } from 'ws';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { NotificationChannel } from '../NotificationChannel';

export interface WebSocket2023HandlerInput {
  channel: NotificationChannel;
  webSocket: WebSocket;
}

/**
 * A handler that is called when a valid WebSocketChannel2023 connection has been made.
 */
export abstract class WebSocket2023Handler extends AsyncHandler<WebSocket2023HandlerInput> {}
