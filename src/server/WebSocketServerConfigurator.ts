import type { IncomingMessage, Server } from 'http';
import type { Socket } from 'net';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { ServerConfigurator } from './ServerConfigurator';

/**
 * {@link ServerConfigurator} that adds WebSocket functionality to an existing {@link Server}.
 *
 * Implementations need to implement the `handleConnection` function to receive the necessary information.
 */
export abstract class WebSocketServerConfigurator extends ServerConfigurator {
  protected readonly logger = getLoggerFor(this);

  public async handle(server: Server): Promise<void> {
    // Create WebSocket server
    const webSocketServer = new WebSocketServer({ noServer: true });
    server.on('upgrade', (upgradeRequest: IncomingMessage, socket: Socket, head: Buffer): void => {
      webSocketServer.handleUpgrade(upgradeRequest, socket, head, (webSocket: WebSocket): void => {
        this.handleConnection(webSocket, upgradeRequest).catch((error: Error): void => {
          this.logger.error(`Something went wrong handling a WebSocket connection: ${createErrorMessage(error)}`);
        });
      });
    });
  }

  protected abstract handleConnection(webSocket: WebSocket, upgradeRequest: IncomingMessage): Promise<void>;
}
