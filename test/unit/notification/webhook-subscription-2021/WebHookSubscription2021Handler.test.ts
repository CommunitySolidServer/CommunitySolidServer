import { v4 } from 'uuid';
import type { HttpClient } from '../../../../src/http/client/HttpClient';
import { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { generateSubscriptionId } from '../../../../src/notification/Subscription';
import type { WebHookSubscription2021 }
  from '../../../../src/notification/webhook-subscription-2021/WebHookSubscription2021Handler';
import { WebHookSubscription2021Handler }
  from '../../../../src/notification/webhook-subscription-2021/WebHookSubscription2021Handler';
import { SOLID_NOTIFICATION } from '../../../../src/util/Vocabularies';

describe('A WebHookSubscription2021Handler', (): void => {
  let httpClient: HttpClient;
  let handler: WebHookSubscription2021Handler;
  let mockSubscription: WebHookSubscription2021;
  let mockResource: ResourceIdentifier;

  beforeEach(async(): Promise<void> => {
    httpClient = {
      call: jest.fn(async(): Promise<any> => Promise.resolve({})),
    };
    handler = new WebHookSubscription2021Handler(httpClient, 'unsubscribe', 'http://example.com');
    mockSubscription = {
      id: generateSubscriptionId('http://example.com/folder/file'),
      type: handler.getType(),
      target: 'http://target.example.com/webhook',
    };
    mockResource = { path: 'http://example.com/folder/file' };
  });

  describe('getType()', (): void => {
    it('should return the implemented notification type.', (): void => {
      expect(handler.getType()).toBe('WebHookSubscription2021');
    });
  });

  describe('subscribe()', (): void => {
    it('should return the expected subscription.', (): void => {
      const mockRequest = {
        topic: 'http://example.com/file.txt',
        target: 'http://other.example.com/hook',
      };
      const result = handler.subscribe(mockRequest);
      expect(result).toMatchObject({
        target: mockRequest.target,
        type: handler.getType(),
        id: expect.any(String),
      });
      expect(result.id.startsWith(encodeURIComponent(mockRequest.topic))).toBe(true);
    });
  });

  describe('getResponseData()', (): void => {
    it('should return the expected Readable.', (): void => {
      const readable = handler.getResponseData(mockSubscription);
      expect(JSON.parse(readable.read())).toMatchObject({
        '@context': SOLID_NOTIFICATION.namespace,
        type: handler.getType(),
        target: mockSubscription.target,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        unsubscribe_endpoint: `http://example.com/unsubscribe/${mockSubscription.id}`,
      });
    });
  });

  describe('onResourceCreated()', (): void => {
    it('should perform the expected HTTP request to the appropriate target url.', async(): Promise<void> => {
      await expect(handler.onResourceCreated(mockResource, mockSubscription)).resolves.toBeUndefined();
      expect(httpClient.call).toHaveBeenCalledTimes(1);
      expect(httpClient.call).toHaveBeenCalledWith(
        mockSubscription.target,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/ld+json',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Length': expect.any(Number),
          }),
        }),
        // I tried creating some kind of RegExp to check this parameter but it was too much of a pain.
        // It being a String means we can't use expect.(eg. objectContaining).
        expect.any(String),
      );
    });

    it('should log (debug) when the HTTP request failed.', async(): Promise<void> => {
      const mockCallReject = jest.fn().mockRejectedValueOnce(new Error('Failed'));
      handler = new WebHookSubscription2021Handler({ call: mockCallReject }, 'unsubscribe', 'http://example.com');
      const loggerSpy = jest.spyOn((handler as any).logger, 'debug');
      await expect(handler.onResourceCreated(mockResource, mockSubscription)).resolves.toBeUndefined();
      expect(mockCallReject).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining(`Failed to inform subscription target:`));
    });
  });

  describe('onResourceUpdated()', (): void => {
    it('should perform a HTTP request to the appropriate target url.', async(): Promise<void> => {
      await expect(handler.onResourceUpdated(mockResource, mockSubscription)).resolves.toBeUndefined();
      expect(httpClient.call).toHaveBeenCalledTimes(1);
      expect(httpClient.call).toHaveBeenCalledWith(mockSubscription.target, expect.anything(), expect.anything());
    });
  });

  describe('onResourceDeleted()', (): void => {
    it('should perform a HTTP request to the appropriate target url.', async(): Promise<void> => {
      await expect(handler.onResourceDeleted(mockResource, mockSubscription)).resolves.toBeUndefined();
      expect(httpClient.call).toHaveBeenCalledTimes(1);
      expect(httpClient.call).toHaveBeenCalledWith(mockSubscription.target, expect.anything(), expect.anything());
    });
  });
});
