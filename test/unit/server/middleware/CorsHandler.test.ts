import { createRequest, createResponse } from 'node-mocks-http';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { CorsHandler } from '../../../../src/server/middleware/CorsHandler';
import { guardStream } from '../../../../src/util/GuardedStream';

describe('a CorsHandler', (): void => {
  it('sets regular CORS headers.', async(): Promise<void> => {
    const handler = new CorsHandler();

    const request = guardStream(createRequest());
    const response = createResponse() as HttpResponse;
    await handler.handleSafe({ request, response });

    expect(response.getHeaders()).toEqual(expect.objectContaining({
      'access-control-allow-origin': '*',
    }));
  });

  it('echoes the origin when specified.', async(): Promise<void> => {
    const handler = new CorsHandler();

    const request = guardStream(createRequest({
      headers: {
        origin: 'example.org',
      },
    }));
    const response = createResponse() as HttpResponse;
    await handler.handleSafe({ request, response });

    expect(response.getHeaders()).toEqual(expect.objectContaining({
      'access-control-allow-origin': 'example.org',
    }));
  });

  it('supports customizations.', async(): Promise<void> => {
    const handler = new CorsHandler({
      exposedHeaders: [ 'Custom-Header' ],
    });

    const request = guardStream(createRequest());
    const response = createResponse() as HttpResponse;
    await handler.handleSafe({ request, response });

    expect(response.getHeaders()).toEqual(expect.objectContaining({
      'access-control-expose-headers': 'Custom-Header',
    }));
  });
});
