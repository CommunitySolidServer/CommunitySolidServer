import { createRequest, createResponse } from 'node-mocks-http';
import { HeaderHandler } from '../../../../src/server/middleware/HeaderHandler';
import { guardStream } from '../../../../src/util/GuardedStream';

describe('a HeaderHandler', (): void => {
  let handler: HeaderHandler;

  beforeAll(async(): Promise<void> => {
    handler = new HeaderHandler();
  });

  it('returns an X-Powered-By header.', async(): Promise<void> => {
    const request = guardStream(createRequest());
    const response = createResponse();
    await handler.handleSafe({ request, response });
    expect(response.getHeaders()).toEqual(expect.objectContaining({
      'x-powered-by': 'Community Solid Server',
    }));
  });
});
