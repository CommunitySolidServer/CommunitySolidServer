import type { WebSocket } from 'ws';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { NotificationChannel } from '../NotificationChannel';

export interface WebSocket2021HandlerInput {
  channel: NotificationChannel;
  webSocket: WebSocket;
}

/**
 * A handler that is called when a valid WebSocketSubscription2021 connection has been made.
 */
export abstract class WebSocket2021Handler extends AsyncHandler<WebSocket2021HandlerInput> {}
