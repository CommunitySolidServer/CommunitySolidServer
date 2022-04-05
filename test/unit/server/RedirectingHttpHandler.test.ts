import { EventEmitter } from 'events';
import { createResponse } from 'node-mocks-http';
import { RedirectingHttpHandler } from '../../../src/server/RedirectingHttpHandler';

describe('A RedirectingHttpHandler', (): void => {
  const handler = new RedirectingHttpHandler({
    '/one': '/two',
    '/from/(.*)': '/to/$1',
    '/f([aeiou]+)/b([aeiou]+)r': '/f$2/b$1r',
  });

  afterEach(jest.clearAllMocks);

  it('does not handle requests without URL.', async(): Promise<void> => {
    const request = { method: 'GET' };
    await expect(handler.canHandle({ request } as any)).rejects
      .toThrow('No redirect configured for undefined');
    await expect(handler.handle({ request } as any)).rejects
      .toThrow('No redirect configured for undefined');
  });

  it('does not handle requests with unconfigured URLs.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/other' };
    await expect(handler.canHandle({ request } as any)).rejects
      .toThrow('No redirect configured for /other');
    await expect(handler.handle({ request } as any)).rejects
      .toThrow('No redirect configured for /other');
  });

  it('handles requests to a known URL.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/one' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(308);
    expect(response.getHeaders()).toHaveProperty('location', '/two');
  });

  it('handles correctly substitutes group patterns.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/fa/boor' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.getHeaders()).toHaveProperty('location', '/foo/bar');
  });

  it('redirects with the provided status code.', async(): Promise<void> => {
    const seeOtherHandler = new RedirectingHttpHandler({ '/one': '/two' }, 303);
    const request = { method: 'GET', url: '/one' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await seeOtherHandler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(303);
    expect(response.getHeaders()).toHaveProperty('location', '/two');
  });
});
