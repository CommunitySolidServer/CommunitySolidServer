import type { IncomingMessage } from 'http';
import {
  generateWebSocketUrl, parseWebSocketRequest,
} from '../../../../../src/server/notifications/WebSocketSubscription2021/WebSocket2021Util';

describe('WebSocket2021Util', (): void => {
  describe('#generateWebSocketUrl', (): void => {
    it('generates a WebSocket link with a query parameter.', async(): Promise<void> => {
      expect(generateWebSocketUrl('http://example.com/', '123456')).toBe('ws://example.com/?auth=123456');

      expect(generateWebSocketUrl('https://example.com/foo/bar', '123456'))
        .toBe('wss://example.com/foo/bar?auth=123456');
    });
  });

  describe('#parseWebSocketRequest', (): void => {
    it('parses the request.', async(): Promise<void> => {
      const request: IncomingMessage = { url: '/foo/bar?auth=123%24456' } as any;
      expect(parseWebSocketRequest(request)).toEqual({ path: '/foo/bar', id: '123$456' });
    });

    it('returns an empty path and no id if the url parameter is undefined.', async(): Promise<void> => {
      const request: IncomingMessage = {} as any;
      expect(parseWebSocketRequest(request)).toEqual({ path: '/' });
    });
  });
});
