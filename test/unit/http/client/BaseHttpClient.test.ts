/* eslint-disable func-style */
import type { IncomingHttpHeaders, IncomingMessage, Server } from 'http';
import { BaseHttpClient } from '../../../../src/http/client/BaseHttpClient';
import { BaseHttpServerFactory } from '../../../../src/server/BaseHttpServerFactory';
import { HttpHandler } from '../../../../src/server/HttpHandler';
import type { HttpHandlerInput } from '../../../../src/server/HttpHandler';

class MockHttpHandler extends HttpHandler {
  public headers?: IncomingHttpHeaders;
  public data?: any;
  public async handle(input: HttpHandlerInput): Promise<void> {
    const { request, response } = input;
    const { headers, readableLength } = request;
    const data = request.read(readableLength);

    if (headers) {
      this.headers = headers;
      this.data = data;
      response.statusCode = 200;
      response.write('DUMMY');
      response.end();
    }
  }
}

describe('A base http client', (): void => {
  const httpHandler = new MockHttpHandler();
  const port = 9898;
  const url = `http://localhost:${port}`;
  let server: Server;
  beforeAll(async(): Promise<void> => {
    server = new BaseHttpServerFactory(httpHandler, { https: false }).startServer(port);
  });
  afterAll((): void => {
    try {
      server.close();
    } catch {
      // Ignored
    }
  });
  it('shoud send headers to the server.', async(): Promise<void> => {
    const client = new BaseHttpClient();
    const callback: (res: IncomingMessage) => void = (res: IncomingMessage): void => {
      expect(res.statusCode).toEqual(200);
    };
    const seconds: (duration: number) => Promise<void> = async function(duration: number): Promise<void> {
      return new Promise<void>((resolve): void => {
        setTimeout((): void => resolve(), duration * 1000);
      });
    };
    client.call(url, { method: 'POST', headers: { accept: 'text/plain' }}, 'DATA', callback);
    await seconds(1);
    expect(httpHandler.headers).toEqual(
      { accept: 'text/plain', connection: 'close', host: `localhost:${port}`, 'transfer-encoding': 'chunked' },
    );
    expect((httpHandler.data as Buffer).toString()).toEqual(Buffer.from('DATA').toString());
  });
});
