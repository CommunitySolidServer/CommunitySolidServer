import type { Server } from 'http';
import type { Socket } from 'net';
import type { WebSocket } from 'ws';
import { Server as WebSocketServer } from 'ws';
import type { HttpRequest } from './HttpRequest';
import type { HttpServerFactory } from './HttpServerFactory';
import type { WebSocketHandler } from './WebSocketHandler';

/**
 * Factory that adds WebSocket functionality to an existing server
 */
export class WebSocketServerFactory implements HttpServerFactory {
  private readonly baseServerFactory: HttpServerFactory;
  private readonly webSocketHandler: WebSocketHandler;

  public constructor(baseServerFactory: HttpServerFactory, webSocketHandler: WebSocketHandler) {
    this.baseServerFactory = baseServerFactory;
    this.webSocketHandler = webSocketHandler;
  }

  public startServer(port: number): Server;
  public startServer(socket: string): Server;
  public startServer(portOrSocket: number | string): Server {
    // Create WebSocket server
    const webSocketServer = new WebSocketServer({ noServer: true });
    webSocketServer.on('connection', async(webSocket: WebSocket, upgradeRequest: HttpRequest): Promise<void> => {
      await this.webSocketHandler.handleSafe({ webSocket, upgradeRequest });
    });

    // Create base HTTP server
    const httpServer = this.baseServerFactory.startServer(portOrSocket);
    httpServer.on('upgrade', (upgradeRequest: HttpRequest, socket: Socket, head: Buffer): void => {
      webSocketServer.handleUpgrade(upgradeRequest, socket, head, (webSocket: WebSocket): void => {
        webSocketServer.emit('connection', webSocket, upgradeRequest);
      });
    });
    return httpServer;
  }
}
