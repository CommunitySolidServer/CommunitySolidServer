import type { IncomingMessage } from 'node:http';
import {
  generateWebSocketUrl,
  parseWebSocketRequest,
} from '../../../../../src/server/notifications/WebSocketChannel2023/WebSocket2023Util';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';

describe('WebSocket2023Util', (): void => {
  describe('#generateWebSocketUrl', (): void => {
    it('generates a WebSocket link.', async(): Promise<void> => {
      expect(generateWebSocketUrl('http://example.com/123456')).toBe('ws://example.com/123456');

      expect(generateWebSocketUrl('https://example.com/foo/bar/123456'))
        .toBe('wss://example.com/foo/bar/123456');
    });
  });

  describe('#parseWebSocketRequest', (): void => {
    it('parses the request.', async(): Promise<void> => {
      const request: IncomingMessage = { url: '/foo/bar/123%24456' } as any;
      expect(parseWebSocketRequest('http://example.com/', request)).toBe('http://example.com/foo/bar/123%24456');
    });

    it('throws an error if the url parameter is not defined.', async(): Promise<void> => {
      const request: IncomingMessage = {} as any;
      expect((): string => parseWebSocketRequest('http://example.com/', request)).toThrow(BadRequestHttpError);
    });

    it('can handle non-root base URLs.', async(): Promise<void> => {
      const request: IncomingMessage = { url: '/foo/bar/123%24456' } as any;
      expect(parseWebSocketRequest('http://example.com/foo/bar/', request)).toBe('http://example.com/foo/bar/123%24456');
    });
  });
});
