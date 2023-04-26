import type { WebSocket } from 'ws';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import type { HttpRequest } from './HttpRequest';

export interface WebSocketHandlerInput {
  webSocket: WebSocket;
  upgradeRequest: HttpRequest;
}

/**
 * A handler to support requests trying to open a WebSocket connection.
 */
export abstract class WebSocketHandler extends AsyncHandler<WebSocketHandlerInput> {}
