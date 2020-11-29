import { createRequest, createResponse } from 'node-mocks-http';
import { CorsHandler } from '../../../../src/server/middleware/CorsHandler';
import { guardStream } from '../../../../src/util/GuardedStream';

describe('a CorsHandler', (): void => {
  let handler: CorsHandler;

  beforeAll(async(): Promise<void> => {
    handler = new CorsHandler();
  });

  it('returns CORS headers.', async(): Promise<void> => {
    const request = guardStream(createRequest());
    const response = createResponse();
    await handler.handleSafe({ request, response });
    expect(response.getHeaders()).toEqual(expect.objectContaining({
      'access-control-allow-origin': '*',
    }));
  });

  it('echoes the origin when specified.', async(): Promise<void> => {
    const request = guardStream(createRequest({
      headers: {
        origin: 'example.org',
      },
    }));
    const response = createResponse();
    await handler.handleSafe({ request, response });
    expect(response.getHeaders()).toEqual(expect.objectContaining({
      'access-control-allow-origin': 'example.org',
    }));
  });
});
