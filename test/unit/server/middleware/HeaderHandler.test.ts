import { createRequest, createResponse } from 'node-mocks-http';
import { HeaderHandler } from '../../../../src/server/middleware/HeaderHandler';
import { guardStream } from '../../../../src/util/GuardedStream';

describe('a HeaderHandler', (): void => {
  it('adds all configured headers.', async(): Promise<void> => {
    const headers = { custom: 'Custom', other: 'Other' };
    const handler = new HeaderHandler(headers);

    const request = guardStream(createRequest());
    const response = createResponse();
    await handler.handleSafe({ request, response });

    expect(response.getHeaders()).toEqual(expect.objectContaining(headers));
  });
});
