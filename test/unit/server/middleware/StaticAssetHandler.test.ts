import { EventEmitter } from 'events';
import fs from 'fs';
import { PassThrough } from 'stream';
import { createResponse } from 'node-mocks-http';
import streamifyArray from 'streamify-array';
import { StaticAssetHandler } from '../../../../src/server/middleware/StaticAssetHandler';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import type { SystemError } from '../../../../src/util/errors/SystemError';
import { getModuleRoot, joinFilePath } from '../../../../src/util/PathUtil';

const createReadStream = jest.spyOn(fs, 'createReadStream')
  .mockImplementation((): any => streamifyArray([ 'file contents' ]));

describe('A StaticAssetHandler', (): void => {
  const handler = new StaticAssetHandler({
    '/foo/bar/style': '/assets/styles/bar.css',
    '/foo/bar/main': '/assets/scripts/bar.js',
    '/foo/bar/unknown': '/assets/bar.unknown',
    '/foo/bar/cwd': 'paths/cwd.txt',
    '/foo/bar/module': '$PACKAGE_ROOT/paths/module.txt',
    '/foo/bar/folder1/': '/assets/folders/1/',
    '/foo/bar/folder2/': '/assets/folders/2',
    '/foo/bar/folder2/subfolder/': '/assets/folders/3',
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
    expect(createReadStream).toHaveBeenCalledWith('/assets/styles/bar.css');
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
    expect(response._getData()).toBe('');
  });

  it('handles a request to a known URL with a query string.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/style?abc=xyz' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/styles/bar.css');
  });

  it('handles a request for an asset with an unknown content type.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/unknown' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'application/octet-stream');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/bar.unknown');
  });

  it('handles a request to a known URL with a relative file path.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/cwd' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/plain');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith(joinFilePath(process.cwd(), '/paths/cwd.txt'));
  });

  it('handles a request to a known URL with a relative to module file path.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/module' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/plain');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith(joinFilePath(getModuleRoot(), '/paths/module.txt'));
  });

  it('throws a 404 when the asset does not exist.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/main' };
    const response = createResponse({ eventEmitter: EventEmitter });
    const error = new Error('no file') as SystemError;
    error.code = 'ENOENT';
    const stream = new PassThrough();
    stream._read = (): any => stream.emit('error', error);
    createReadStream.mockReturnValueOnce(stream as any);

    await expect(handler.handleSafe({ request, response } as any)).rejects
      .toThrow(NotFoundHttpError);
  });

  it('throws a 404 when the asset is folder.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/main' };
    const response = createResponse({ eventEmitter: EventEmitter });
    const error = new Error('is directory') as SystemError;
    error.code = 'EISDIR';
    const stream = new PassThrough();
    stream._read = (): any => stream.emit('error', error);
    createReadStream.mockReturnValueOnce(stream as any);

    await expect(handler.handleSafe({ request, response } as any)).rejects
      .toThrow(NotFoundHttpError);
  });

  it('handles a request for an asset that errors.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/main' };
    const response = createResponse({ eventEmitter: EventEmitter });
    const responseEnd = new Promise((resolve): any => response.on('end', resolve));
    const error = new Error('random error');
    const stream = new PassThrough();
    stream._read = (): any => stream.emit('error', error);
    createReadStream.mockReturnValueOnce(stream as any);

    await handler.handleSafe({ request, response } as any);

    await responseEnd;
    expect(response._getData()).toBe('');
  });

  it('handles a request to a known folder URL defined without slash.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/folder1/abc/def.css' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/folders/1/abc/def.css');
  });

  it('handles a request to a known folder URL defined with slash.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/folder2/abc/def.css?abc=def' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/folders/2/abc/def.css');
  });

  it('prefers the longest path handler.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/folder2/subfolder/abc/def.css?' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/folders/3/abc/def.css');
  });

  it('handles a request to a known folder URL with spaces.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/folder2/a%20b%20c/def.css' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/folders/2/a b c/def.css');
  });

  it('does not handle a request to a known folder URL with parent path segments.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/folder1/../def.css' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await expect(handler.canHandle({ request, response } as any)).rejects.toThrow();
  });

  it('caches responses when the expires option is set.', async(): Promise<void> => {
    jest.spyOn(Date, 'now').mockReturnValue(0);
    const cachedHandler = new StaticAssetHandler({
      '/foo/bar/style': '/assets/styles/bar.css',
    }, {
      expires: 86400,
    });
    const request = { method: 'GET', url: '/foo/bar/style' };
    const response = createResponse();
    await cachedHandler.handleSafe({ request, response } as any);
    jest.restoreAllMocks();

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('cache-control', 'max-age=86400');
    expect(response.getHeaders()).toHaveProperty('expires', 'Fri, 02 Jan 1970 00:00:00 GMT');
  });
});
