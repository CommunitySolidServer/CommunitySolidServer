import EventEmitter from 'events';
import fs from 'fs';
import { createResponse } from 'node-mocks-http';
import streamifyArray from 'streamify-array';
import { StaticAssetHandler } from '../../../../src/server/middleware/StaticAssetHandler';

const createReadStream = jest.spyOn(fs, 'createReadStream')
  .mockReturnValue(streamifyArray([ 'file contents' ]) as any);

describe('a StaticAssetHandler', (): void => {
  const handler = new StaticAssetHandler({
    '/foo/bar/style': '/assets/styles/bar.css',
    '/foo/bar/main': '/assets/scripts/bar.js',
    '/foo/bar/unknown': '/assets/bar.unknown',
  });

  afterEach(jest.clearAllMocks);

  it('does not handle POST requests.', async(): Promise<void> => {
    const request = { method: 'POST' };
    await expect(handler.canHandle({ request } as any)).rejects
      .toThrow('Only GET and HEAD requests are supported');
  });

  it('does not handle requests without URL.', async(): Promise<void> => {
    const request = { method: 'GET' };
    await expect(handler.canHandle({ request } as any)).rejects
      .toThrow('No static resource');
  });

  it('does not handle requests with unconfigured URLs.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/other' };
    await expect(handler.canHandle({ request } as any)).rejects
      .toThrow('No static resource');
  });

  it('handles a GET request to a known URL.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/style' };
    const response = createResponse({ eventEmitter: EventEmitter });
    const responseEnd = new Promise((resolve): any => response.on('end', resolve));
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    await responseEnd;
    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/styles/bar.css', 'utf8');
    expect(response._getData()).toBe('file contents');
  });

  it('handles a HEAD request to a known URL.', async(): Promise<void> => {
    const request = { method: 'HEAD', url: '/foo/bar/main' };
    const response = createResponse({ eventEmitter: EventEmitter });
    const responseEnd = new Promise((resolve): any => response.on('end', resolve));
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'application/javascript');

    await responseEnd;
    expect(createReadStream).toHaveBeenCalledTimes(0);
    expect(response._getData()).toBe('');
  });

  it('handles a request to a known URL with a query string.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/style?abc=xyz' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/styles/bar.css', 'utf8');
  });

  it('handles a request for an asset with an unknown content type.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/unknown' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'application/octet-stream');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/bar.unknown', 'utf8');
  });

  it('handles a request for an asset that errors.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/main' };
    const response = createResponse({ eventEmitter: EventEmitter });
    const responseEnd = new Promise((resolve): any => response.on('end', resolve));
    await handler.handleSafe({ request, response } as any);

    createReadStream.mock.results[0].value.emit('error', new Error());

    await responseEnd;
    expect(response._getData()).toBe('');
  });
});
