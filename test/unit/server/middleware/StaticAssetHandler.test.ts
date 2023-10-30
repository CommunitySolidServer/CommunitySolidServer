import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { PassThrough, Readable } from 'node:stream';
import { createResponse } from 'node-mocks-http';
import { StaticAssetEntry, StaticAssetHandler } from '../../../../src/server/middleware/StaticAssetHandler';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import type { SystemError } from '../../../../src/util/errors/SystemError';
import { getModuleRoot, joinFilePath } from '../../../../src/util/PathUtil';

const createReadStream = jest.spyOn(fs, 'createReadStream')
  .mockImplementation((): any => Readable.from([ 'file contents' ]));

describe('A StaticAssetHandler', (): void => {
  const assets = [
    new StaticAssetEntry('/', '/assets/README.md'),
    new StaticAssetEntry('/foo/bar/style', '/assets/styles/bar.css'),
    new StaticAssetEntry('/foo/bar/main', '/assets/scripts/bar.js'),
    new StaticAssetEntry('/foo/bar/unknown', '/assets/bar.unknown'),
    new StaticAssetEntry('/foo/bar/cwd', 'paths/cwd.txt'),
    new StaticAssetEntry('/foo/bar/module', '@css:paths/module.txt'),
    new StaticAssetEntry('/foo/bar/document/', '/assets/document.txt'),
    new StaticAssetEntry('/foo/bar/folder/', '/assets/folders/1/'),
    new StaticAssetEntry('/foo/bar/folder/subfolder/', '/assets/folders/2/'),
  ];

  const handler = new StaticAssetHandler(assets, 'http://localhost:3000');

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

  it('handles URLs with a trailing slash that link to a document.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/document/' };
    const response = createResponse({ eventEmitter: EventEmitter });
    const responseEnd = new Promise((resolve): any => response.on('end', resolve));
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/plain');

    await responseEnd;
    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/document.txt');
    expect(response._getData()).toBe('file contents');
  });

  it('requires folders to be linked to URLs ending on a slash.', async(): Promise<void> => {
    expect((): StaticAssetHandler => new StaticAssetHandler([ new StaticAssetEntry('/foo', '/bar/') ], 'http://example.com/'))
      .toThrow(InternalServerError);
  });

  it('handles a request to a known folder URL defined with slash.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/folder/abc/def.css?abc=def' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/folders/1/abc/def.css');
  });

  it('prefers the longest path handler.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/folder/subfolder/abc/def.css?' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/folders/2/abc/def.css');
  });

  it('handles a request to a known folder URL with spaces.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/folder/a%20b%20c/def.css' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await handler.handleSafe({ request, response } as any);

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/css');

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/assets/folders/1/a b c/def.css');
  });

  it('does not handle a request to a known folder URL with parent path segments.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/foo/bar/folder/../def.css' };
    const response = createResponse({ eventEmitter: EventEmitter });
    await expect(handler.canHandle({ request, response } as any))
      .rejects.toThrow('No static resource configured at /foo/bar/folder/../def.css');
  });

  it('caches responses when the expires option is set.', async(): Promise<void> => {
    jest.spyOn(Date, 'now').mockReturnValue(0);
    const cachedHandler = new StaticAssetHandler(
      [ new StaticAssetEntry('/foo/bar/style', '/assets/styles/bar.css') ],
      'http://localhost:3000',
      { expires: 86400 },
    );
    const request = { method: 'GET', url: '/foo/bar/style' };
    const response = createResponse();
    await cachedHandler.handleSafe({ request, response } as any);
    jest.restoreAllMocks();

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('cache-control', 'max-age=86400');
    expect(response.getHeaders()).toHaveProperty('expires', 'Fri, 02 Jan 1970 00:00:00 GMT');
  });
});
