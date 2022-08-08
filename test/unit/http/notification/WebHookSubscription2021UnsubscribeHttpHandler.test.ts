import type { CredentialsExtractor } from '../../../../src/authentication/CredentialsExtractor';
import {
  WebHookSubscription2021UnsubscribeHttpHandler,
} from '../../../../src/http/notification/WebHookSubscription2021UnsubscribeHttpHandler';
import { generateSubscriptionId } from '../../../../src/notification/Subscription';
import type { Topic } from '../../../../src/notification/Topic';
import type {
  WebHookSubscription2021,
} from '../../../../src/notification/webhook-subscription-2021/WebHookSubscription2021Handler';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { OperationHttpHandlerInput } from '../../../../src/server/OperationHttpHandler';
import { MemoryMapStorage } from '../../../../src/storage/keyvalue/MemoryMapStorage';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A WebHookSubscription2021UnsubscribeHttpHandler', (): void => {
  let handler: WebHookSubscription2021UnsubscribeHttpHandler;
  let mockCredentialsExtractor: CredentialsExtractor;
  let notificationStorage: MemoryMapStorage<Topic>;
  const mockWebid = 'http://example.com/webid';

  beforeEach((): void => {
    mockCredentialsExtractor = {
      handleSafe: jest.fn().mockResolvedValue({ agent: { webId: mockWebid }}),
    } as unknown as CredentialsExtractor;
    notificationStorage = new MemoryMapStorage<Topic>();

    handler = new WebHookSubscription2021UnsubscribeHttpHandler(
      'http://example.com',
      mockCredentialsExtractor,
      notificationStorage,
    );
  });

  describe('canHandle()', (): void => {
    it('should only accept DELETE requests.', async(): Promise<void> => {
      await expect(handler.canHandle({ operation: { method: 'GET' } as any }))
        .rejects.toThrow(NotImplementedHttpError);
      await expect(handler.canHandle({ operation: { method: 'PUT' } as any }))
        .rejects.toThrow(NotImplementedHttpError);
      await expect(handler.canHandle({ operation: { method: 'POST' } as any }))
        .rejects.toThrow(NotImplementedHttpError);
      await expect(handler.canHandle({ operation: { method: 'DELETE' } as any }))
        .resolves.toBeUndefined();
    });
  });

  describe('handle()', (): void => {
    let mockInput: OperationHttpHandlerInput;
    const mockTarget = 'http://example.com/folder/file';
    const mockSubscriptionId = generateSubscriptionId(mockTarget);
    const mockStorageLocation = encodeURIComponent(mockTarget);

    beforeEach(async(): Promise<void> => {
      mockInput = {
        request: {
          url: `http://example.com/unsubscribe/webhook/${mockSubscriptionId}`,
        } as unknown as HttpRequest,
      } as unknown as OperationHttpHandlerInput;

      await notificationStorage.set(mockStorageLocation, {
        subscriptions: {
          [mockWebid]: {
            type: 'WebHookSubscription2021',
            id: mockSubscriptionId,
            target: mockTarget,
          } as unknown as WebHookSubscription2021,
          'http://example.com/otherWebid': {
            type: 'SomeOtherSubscription',
          },
        },
      });
    });

    it('should throw when there is no webid present in the credentials.', async(): Promise<void> => {
      mockCredentialsExtractor.handleSafe = jest.fn().mockResolvedValue({ agent: { webId: undefined }});
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should throw when the request does contain a field called "url".', async(): Promise<void> => {
      mockInput.request.url = undefined;
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should throw when request.url contains an invalid subscription id.', async(): Promise<void> => {
      mockInput.request.url = 'http://example.com/unsubscribe/webhook/invalid~id';
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should throw when the subscription does not exist.', async(): Promise<void> => {
      await notificationStorage.delete(mockStorageLocation);
      const before = await notificationStorage.get(mockStorageLocation);
      expect(before?.subscriptions[mockWebid]).toBeUndefined();
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should delete the subscription from the store when completed.', async(): Promise<void> => {
      const before = await notificationStorage.get(mockStorageLocation);
      expect(before?.subscriptions[mockWebid]).toBeDefined();
      await expect(handler.handle(mockInput)).resolves.toBeDefined();
      const after = await notificationStorage.get(mockStorageLocation);
      expect(after?.subscriptions[mockWebid]).toBeUndefined();
    });

    it('should return the expected empty response.', async(): Promise<void> => {
      const result = handler.handle(mockInput);
      await expect(result).resolves.toBeDefined();
      const awaitedResult = await result;
      expect(awaitedResult.statusCode).toBe(200);
      expect(awaitedResult.metadata?.contentType).toBe('application/ld+json');
    });
  });
});
