import type { Server } from 'http';
import request from 'supertest';
import { ExpressHttpServerFactory } from '../../../src/server/ExpressHttpServerFactory';
import type { HttpHandler } from '../../../src/server/HttpHandler';
import type { HttpResponse } from '../../../src/server/HttpResponse';

const handler: jest.Mocked<HttpHandler> = {
  handleSafe: jest.fn(async(input: { response: HttpResponse }): Promise<void> => {
    input.response.writeHead(200);
    input.response.end();
  }),
} as any;

describe('ExpressHttpServerFactory', (): void => {
  let server: Server;

  beforeAll(async(): Promise<void> => {
    const factory = new ExpressHttpServerFactory(handler);
    server = factory.startServer(5555);
  });

  afterAll(async(): Promise<void> => {
    server.close();
  });

  it('sends incoming requests to the handler.', async(): Promise<void> => {
    await request(server).get('/').set('Host', 'test.com').expect(200);

    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({
      request: expect.objectContaining({
        headers: expect.objectContaining({ host: 'test.com' }),
      }),
      response: expect.objectContaining({}),
    });
  });

  it('returns a 404 when the handler does not do anything.', async(): Promise<void> => {
    handler.handleSafe.mockResolvedValueOnce(undefined);

    await expect(request(server).get('/').expect(404)).resolves.toBeDefined();
  });

  it('writes an error to the HTTP response.', async(): Promise<void> => {
    handler.handleSafe.mockRejectedValueOnce(new Error('dummyError'));

    const res = await request(server).get('/').expect(500);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(res.text).toContain('dummyError');
  });

  it('does not write an error if the response had been started.', async(): Promise<void> => {
    handler.handleSafe.mockImplementationOnce(async(input: { response: HttpResponse }): Promise<void> => {
      input.response.write('content');
      throw new Error('dummyError');
    });

    const res = await request(server).get('/');
    expect(res.text).not.toContain('dummyError');
  });

  it('throws unknown errors if its handler throw non-Error objects.', async(): Promise<void> => {
    handler.handleSafe.mockRejectedValueOnce('apple');

    const res = await request(server).get('/').expect(500);
    expect(res.text).toContain('Unknown error.');
  });
});
