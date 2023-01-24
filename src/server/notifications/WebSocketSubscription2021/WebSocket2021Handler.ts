import type { WebSocket } from 'ws';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { NotificationChannelInfo } from '../NotificationChannelStorage';

export interface WebSocket2021HandlerInput {
  info: NotificationChannelInfo;
  webSocket: WebSocket;
}

/**
 * A handler that is called when a valid WebSocketSubscription2021 connection has been made.
 */
export abstract class WebSocket2021Handler extends AsyncHandler<WebSocket2021HandlerInput> {}
