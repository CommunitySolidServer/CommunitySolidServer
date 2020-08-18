import { ExpressHttpServer } from '../../../src/server/ExpressHttpServer';
import { HttpHandler } from '../../../src/server/HttpHandler';
import { HttpRequest } from '../../../src/server/HttpRequest';
import { HttpResponse } from '../../../src/server/HttpResponse';
import request from 'supertest';
import { Server } from 'http';

const handle = async(input: { request: HttpRequest; response: HttpResponse }): Promise<void> => {
  input.response.writeHead(200);
  input.response.end();
};

class SimpleHttpHandler extends HttpHandler {
  public async canHandle(): Promise<void> {
    // Supports all HttpRequests
  }

  public async handle(input: { request: HttpRequest; response: HttpResponse }): Promise<void> {
    return handle(input);
  }
}

describe('ExpressHttpServer', (): void => {
  let server: Server;
  let canHandleJest: jest.Mock<Promise<void>, []>;
  let handleJest: jest.Mock<Promise<void>, [any]>;
  let handler: SimpleHttpHandler;
  beforeEach(async(): Promise<void> => {
    handler = new SimpleHttpHandler();
    canHandleJest = jest.fn(async(): Promise<void> => undefined);
    handleJest = jest.fn(async(input): Promise<void> => handle(input));

    handler.canHandle = canHandleJest;
    handler.handle = handleJest;

    const expressServer = new ExpressHttpServer(handler);
    server = expressServer.listen();
  });

  afterEach(async(): Promise<void> => {
    // Close server
    server.close();
  });

  it('returns CORS headers for an OPTIONS request.', async(): Promise<void> => {
    const res = await request(server)
      .options('/')
      .set('Access-Control-Request-Headers', 'content-type')
      .set('Access-Control-Request-Method', 'POST')
      .set('Host', 'test.com')
      .expect(204);
    expect(res.header).toEqual(expect.objectContaining({
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
    }));
    const corsMethods = res.header['access-control-allow-methods'].split(',')
      .map((method: string): string => method.trim());
    const allowedMethods = [ 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE' ];
    expect(corsMethods).toEqual(expect.arrayContaining(allowedMethods));
    expect(corsMethods.length).toBe(allowedMethods.length);
  });

  it('specifies CORS origin header if an origin was supplied.', async(): Promise<void> => {
    const res = await request(server).get('/').set('origin', 'test.com').expect(200);
    expect(res.header).toEqual(expect.objectContaining({ 'access-control-allow-origin': 'test.com' }));
  });

  it('sends incoming requests to the handler.', async(): Promise<void> => {
    await request(server).get('/').set('Host', 'test.com').expect(200);
    expect(canHandleJest).toHaveBeenCalledTimes(1);
    expect(handleJest).toHaveBeenCalledTimes(1);
    expect(handleJest).toHaveBeenLastCalledWith({
      request: expect.objectContaining({
        headers: expect.objectContaining({ host: 'test.com' }),
      }),
      response: expect.objectContaining({}),
    });
  });

  it('catches errors thrown by its handler.', async(): Promise<void> => {
    handler.handle = async(): Promise<void> => {
      throw new Error('dummyError');
    };

    // Prevent test from writing to stderr
    jest.spyOn(process.stderr, 'write').mockImplementation((): boolean => true);

    const res = await request(server).get('/').expect(500);
    expect(res.text).toContain('dummyError');
  });
});
