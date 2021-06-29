import { createRequest, createResponse } from 'node-mocks-http';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { HeaderHandler } from '../../../../src/server/middleware/HeaderHandler';
import { guardStream } from '../../../../src/util/GuardedStream';

describe('a HeaderHandler', (): void => {
  it('adds all configured headers.', async(): Promise<void> => {
    const headers = { custom: 'Custom', other: 'Other' };
    const handler = new HeaderHandler(headers);

    const request = guardStream(createRequest());
    const response = createResponse() as HttpResponse;
    await handler.handleSafe({ request, response });

    expect(response.getHeaders()).toEqual(expect.objectContaining(headers));
  });
});
