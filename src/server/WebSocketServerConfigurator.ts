import type { IncomingMessage, Server } from 'node:http';
import type { Socket } from 'node:net';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { guardStream } from '../util/GuardedStream';
import { ServerConfigurator } from './ServerConfigurator';
import type { WebSocketHandler } from './WebSocketHandler';

/**
 * {@link ServerConfigurator} that adds WebSocket functionality to an existing {@link Server}.
 *
 * Listens for WebSocket requests and sends them to its handler.
 */
export class WebSocketServerConfigurator extends ServerConfigurator {
  protected readonly logger = getLoggerFor(this);

  private readonly handler: WebSocketHandler;

  public constructor(handler: WebSocketHandler) {
    super();
    this.handler = handler;
  }

  public async handle(server: Server): Promise<void> {
    // Create WebSocket server
    const webSocketServer = new WebSocketServer({ noServer: true });
    server.on('upgrade', (upgradeRequest: IncomingMessage, socket: Socket, head: Buffer): void => {
      // eslint-disable-next-line ts/no-misused-promises
      webSocketServer.handleUpgrade(upgradeRequest, socket, head, async(webSocket: WebSocket): Promise<void> => {
        try {
          await this.handler.handleSafe({ upgradeRequest: guardStream(upgradeRequest), webSocket });
        } catch (error: unknown) {
          this.logger.error(`Something went wrong handling a WebSocket connection: ${createErrorMessage(error)}`);
          webSocket.send(`There was an error opening this WebSocket: ${createErrorMessage(error)}`);
          webSocket.close();
        }
      });
    });
  }
}
