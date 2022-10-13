import {
  generateWebHookUnsubscribeUrl, parseWebHookUnsubscribeUrl,
} from '../../../../../src/server/notifications/WebHookSubscription2021/WebHook2021Util';

describe('WebHook2021Util', (): void => {
  describe('#generateWebHookUnsubscribeUrl', (): void => {
    it('generates the URL with the identifier.', async(): Promise<void> => {
      expect(generateWebHookUnsubscribeUrl('http://example.com/unsubscribe', '123$456'))
        .toBe('http://example.com/unsubscribe/123%24456');
    });
  });

  describe('#parseWebHookUnsubscribeUrl', (): void => {
    it('returns the parsed identifier from the URL.', async(): Promise<void> => {
      expect(parseWebHookUnsubscribeUrl('http://example.com/unsubscribe/123%24456')).toBe('123$456');
    });
  });
});
