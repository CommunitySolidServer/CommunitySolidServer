import type { Server } from 'http';
import request from 'supertest';
import WebSocket from 'ws';
import { BaseHttpServerFactory } from '../../../src/server/BaseHttpServerFactory';
import type { HttpHandlerInput } from '../../../src/server/HttpHandler';
import { HttpHandler } from '../../../src/server/HttpHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import { WebSocketHandler } from '../../../src/server/WebSocketHandler';
import { WebSocketServerFactory } from '../../../src/server/WebSocketServerFactory';

class SimpleHttpHandler extends HttpHandler {
  public async handle(input: HttpHandlerInput): Promise<void> {
    input.response.end('SimpleHttpHandler');
  }
}

class SimpleWebSocketHandler extends WebSocketHandler {
  public host: any;

  public async handle(input: { webSocket: WebSocket; upgradeRequest: HttpRequest }): Promise<void> {
    input.webSocket.send('SimpleWebSocketHandler');
    input.webSocket.close();
    this.host = input.upgradeRequest.headers.host;
  }
}

describe('SimpleWebSocketHandler', (): void => {
  let webSocketHandler: SimpleWebSocketHandler;
  let server: Server;

  beforeAll(async(): Promise<void> => {
    const httpHandler = new SimpleHttpHandler();
    webSocketHandler = new SimpleWebSocketHandler();
    const httpServerFactory = new BaseHttpServerFactory(httpHandler);
    const webSocketServerFactory = new WebSocketServerFactory(httpServerFactory, webSocketHandler);
    server = webSocketServerFactory.startServer(5556);
  });

  afterAll(async(): Promise<void> => {
    server.close();
  });

  it('has a functioning HTTP interface.', async(): Promise<void> => {
    const result = await request(server).get('/').expect('SimpleHttpHandler');
    expect(result).toBeDefined();
  });

  it('has a functioning WebSockets interface.', async(): Promise<void> => {
    const client = new WebSocket('ws://localhost:5556');
    const buffer = await new Promise<Buffer>((resolve): any => client.on('message', resolve));
    expect(buffer.toString()).toBe('SimpleWebSocketHandler');
    expect(webSocketHandler.host).toBe('localhost:5556');
  });
});
