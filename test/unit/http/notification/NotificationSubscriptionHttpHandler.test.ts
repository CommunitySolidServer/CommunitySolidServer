import EventEmitter from 'events';
import type { CredentialsExtractor } from '../../../../src/authentication/CredentialsExtractor';
import type { PermissionReader } from '../../../../src/authorization/PermissionReader';
import {
  NotificationSubscriptionHttpHandler,
} from '../../../../src/http/notification/NotificationSubscriptionHttpHandler';
import type { Subscription } from '../../../../src/notification/Subscription';
import type { SubscriptionHandler } from '../../../../src/notification/SubscriptionHandler';
import type { Topic } from '../../../../src/notification/Topic';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { OperationHttpHandlerInput } from '../../../../src/server/OperationHttpHandler';
import { MemoryMapStorage } from '../../../../src/storage/keyvalue/MemoryMapStorage';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { AS } from '../../../../src/util/Vocabularies';

describe('A NotificationSubscriptionHttpHandler', (): void => {
  let handler: NotificationSubscriptionHttpHandler;
  let mockCredentialsExtractor: CredentialsExtractor;
  let mockPermissionReader: PermissionReader;
  let notificationStorage: MemoryMapStorage<Topic>;
  let source: EventEmitter;
  let mockSubscriptionHandler: SubscriptionHandler<Subscription>;
  const mockWebId = 'http://example.com/webid';
  const mockType = 'WebHook';

  beforeEach((): void => {
    mockCredentialsExtractor = {
      handleSafe: jest.fn().mockResolvedValue({ agent: { webId: mockWebId }}),
    } as unknown as CredentialsExtractor;
    mockPermissionReader = {
      handleSafe: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue({ public: { read: true }, agent: { read: true }}),
      }),
    } as unknown as PermissionReader;
    notificationStorage = new MemoryMapStorage<Topic>();
    source = new EventEmitter();
    mockSubscriptionHandler = {
      getType: jest.fn().mockReturnValue(mockType),
      onChange: jest.fn(),
      subscribe: jest.fn().mockReturnValue({ type: mockType }),
      getResponseData: jest.fn().mockReturnValue('mockResponseData'),
    } as unknown as SubscriptionHandler<Subscription>;

    handler = new NotificationSubscriptionHttpHandler(
      mockCredentialsExtractor,
      mockPermissionReader,
      notificationStorage,
      source,
      [ mockSubscriptionHandler ],
      'http://example.com/',
    );
  });

  describe('canHandle()', (): void => {
    it('should only accept POST requests.', async(): Promise<void> => {
      await expect(handler.canHandle({ operation: { method: 'GET' } as any }))
        .rejects.toThrow(NotImplementedHttpError);
      await expect(handler.canHandle({ operation: { method: 'PUT' } as any }))
        .rejects.toThrow(NotImplementedHttpError);
      await expect(handler.canHandle({ operation: { method: 'DELETE' } as any }))
        .rejects.toThrow(NotImplementedHttpError);
      await expect(handler.canHandle({ operation: { method: 'POST' } as any }))
        .resolves.toBeUndefined();
    });
  });

  describe('getSupportedTypes()', (): void => {
    it('should return all supported types.', async(): Promise<void> => {
      expect(handler.getSupportedTypes()).toEqual([ mockType ]);
    });
  });

  describe('handle()', (): void => {
    let mockInput: OperationHttpHandlerInput;
    const mockBody = {
      topic: 'http://example.come/folder/file',
      target: 'http://other.example.com/hook',
      type: mockType,
    };

    beforeEach((): void => {
      mockInput = {
        request: {
          read: jest.fn().mockReturnValue(JSON.stringify(mockBody)),
        } as unknown as HttpRequest,
      } as unknown as OperationHttpHandlerInput;
    });

    it('should throw when no body is present in the request.', async(): Promise<void> => {
      mockInput.request.read = jest.fn().mockReturnValue('');
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should throw when no the body does not contain a field called "topic".', async(): Promise<void> => {
      mockInput.request.read = jest.fn().mockReturnValue(JSON.stringify({
        ...mockBody, topic: undefined,
      }));
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should throw when no the body does not contain a field called "target".', async(): Promise<void> => {
      mockInput.request.read = jest.fn().mockReturnValue(JSON.stringify({
        ...mockBody, target: undefined,
      }));
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should throw when no the body does not contain a field called "type".', async(): Promise<void> => {
      mockInput.request.read = jest.fn().mockReturnValue(JSON.stringify({
        ...mockBody, type: undefined,
      }));
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should throw when the requested type is not supported.', async(): Promise<void> => {
      mockInput.request.read = jest.fn().mockReturnValue(JSON.stringify({
        ...mockBody, type: 'UnsupportedType',
      }));
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should throw when there is no webid present in the credentials.', async(): Promise<void> => {
      mockCredentialsExtractor.handleSafe = jest.fn().mockResolvedValue({ agent: { webId: undefined }});
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should throw when the user does not have access to the topic/resource.', async(): Promise<void> => {
      mockPermissionReader.handleSafe = jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue({ agent: { read: false }}),
      });
      await expect(handler.handle(mockInput)).rejects.toThrow(BadRequestHttpError);
    });

    it('should save the new subscription correctly in the storage.', async(): Promise<void> => {
      const mockStorageLocation = encodeURIComponent(mockBody.topic);

      await expect(notificationStorage.has(mockStorageLocation)).resolves.toBe(false);
      await expect(handler.handle(mockInput)).resolves.toBeDefined();
      await expect(notificationStorage.has(mockStorageLocation)).resolves.toBe(true);
      await expect(notificationStorage.get(mockStorageLocation)).resolves.toMatchObject({
        subscriptions: { [mockWebId]: { type: mockType }},
      });
    });

    it('should save the new subscription correctly in the storage (folder).', async(): Promise<void> => {
      mockBody.topic = 'http://example.com/folder/';
      mockInput.request.read = jest.fn().mockReturnValue(JSON.stringify(mockBody));
      const mockStorageLocation = encodeURIComponent(mockBody.topic);

      await expect(notificationStorage.has(mockStorageLocation)).resolves.toBe(false);
      await expect(handler.handle(mockInput)).resolves.toBeDefined();
      await expect(notificationStorage.has(mockStorageLocation)).resolves.toBe(true);
      await expect(notificationStorage.get(mockStorageLocation)).resolves.toMatchObject({
        subscriptions: { [mockWebId]: { type: mockType }},
      });
    });

    it('should return the right response.', async(): Promise<void> => {
      const result = handler.handle(mockInput);
      await expect(result).resolves.toBeDefined();
      const awaitedResult = await result;
      expect(awaitedResult.statusCode).toBe(200);
      expect(awaitedResult.data).toBe('mockResponseData');
      expect(awaitedResult.metadata?.contentType).toBe('application/ld+json');
    });
  });

  describe('event handling', (): void => {
    // Using all AS namespace values to ensure all lines and branches are covered.

    it('should call the appropriate subscriptionHandler\'s onChange function.', async(): Promise<void> => {
      const resource = { path: 'http://example.com/folder/file' };
      await notificationStorage.set(encodeURIComponent(resource.path), {
        subscriptions: { [mockWebId]: { type: mockType }},
      });

      source.emit(AS.Create, resource);
      // Wait a couple milliseconds because we can't await the promise
      await new Promise<void>((resolve): number => setTimeout(resolve, 10));

      expect(mockSubscriptionHandler.onChange).toHaveBeenCalledTimes(1);
      expect(mockSubscriptionHandler.onChange).toHaveBeenCalledWith(resource, AS.Create, { type: mockType });
    });

    it('should call the appropriate subscriptionHandler\'s onChange function (folder).', async(): Promise<void> => {
      const resource = { path: 'http://example.com/folder/' };
      await notificationStorage.set(encodeURIComponent(resource.path), {
        subscriptions: { [mockWebId]: { type: mockType }},
      });

      source.emit(AS.Create, resource);
      // Wait a couple milliseconds because we can't await the promise
      await new Promise<void>((resolve): number => setTimeout(resolve, 10));

      expect(mockSubscriptionHandler.onChange).toHaveBeenCalledTimes(1);
      expect(mockSubscriptionHandler.onChange).toHaveBeenCalledWith(resource, AS.Create, { type: mockType });
    });

    it('should not call a subscriptionHandler of the wrong type.', async(): Promise<void> => {
      const resource = { path: 'http://example.com/folder/file' };
      await notificationStorage.set(resource.path, {
        subscriptions: { [mockWebId]: { type: 'UnsupportedTypeForSomeReason' }},
      });

      source.emit(AS.Update, resource);
      // Wait a couple milliseconds because we can't await the promise
      await new Promise<void>((resolve): number => setTimeout(resolve, 10));

      expect(mockSubscriptionHandler.onChange).toHaveBeenCalledTimes(0);
    });

    it('should not call any handler if there are no subscriptions for the topic.', async(): Promise<void> => {
      const resource = { path: 'http://example.com/folder/file' };

      source.emit(AS.Delete, resource);
      // Wait a couple milliseconds because we can't await the promise
      await new Promise<void>((resolve): number => setTimeout(resolve, 10));

      expect(mockSubscriptionHandler.onChange).toHaveBeenCalledTimes(0);
    });

    it('should not call a handler if the resource is excluded.', async(): Promise<void> => {
      handler = new NotificationSubscriptionHttpHandler(
        mockCredentialsExtractor,
        mockPermissionReader,
        notificationStorage,
        source,
        [ mockSubscriptionHandler ],
        'http://example.com/',
        [ '^\\.internal.*' ],
      );

      const resource = { path: 'http://example.com/.internal/file' };

      source.emit(AS.Update, resource);
      // Wait a couple milliseconds because we can't await the promise
      await new Promise<void>((resolve): number => setTimeout(resolve, 10));

      expect(mockSubscriptionHandler.onChange).toHaveBeenCalledTimes(0);
    });
  });
});
