import { NotificationGatewayHttpHandler } from '../../../../src/http/notification/NotificationGatewayHttpHandler';
import type {
  NotificationSubscriptionHttpHandler,
} from '../../../../src/http/notification/NotificationSubscriptionHttpHandler';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { OperationHttpHandlerInput } from '../../../../src/server/OperationHttpHandler';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A NotificationGatewayHttpHandler', (): void => {
  let gateway: NotificationGatewayHttpHandler;

  beforeEach((): void => {
    gateway = new NotificationGatewayHttpHandler(
      {
        getSupportedTypes: jest.fn((): string[] => [ 'foo', 'bar' ]),
      } as unknown as NotificationSubscriptionHttpHandler,
      'http://example.com',
      'subscribe',
    );
  });

  describe('canHandle()', (): void => {
    it('should only accept POST requests.', async(): Promise<void> => {
      await expect(gateway.canHandle({ operation: { method: 'GET' } as any }))
        .rejects.toThrow(NotImplementedHttpError);
      await expect(gateway.canHandle({ operation: { method: 'PUT' } as any }))
        .rejects.toThrow(NotImplementedHttpError);
      await expect(gateway.canHandle({ operation: { method: 'DELETE' } as any }))
        .rejects.toThrow(NotImplementedHttpError);
      await expect(gateway.canHandle({ operation: { method: 'POST' } as any }))
        .resolves.toBeUndefined();
    });
  });

  describe('handle()', (): void => {
    it('should throw when the request body does not contain a field called "type".', async(): Promise<void> => {
      const input = {
        request: { read: jest.fn().mockResolvedValue(JSON.stringify({})) } as unknown as HttpRequest,
      } as unknown as OperationHttpHandlerInput;
      await expect(gateway.handle(input)).rejects.toThrow(BadRequestHttpError);
      const input2 = {
        request: { read: jest.fn().mockResolvedValue(undefined) } as unknown as HttpRequest,
      } as unknown as OperationHttpHandlerInput;
      await expect(gateway.handle(input2)).rejects.toThrow(SyntaxError);
    });

    it(
      'should throw when the request body does contain a field called "type" but it is not of type Array.',
      async(): Promise<void> => {
        const input = {
          request: { read: jest.fn().mockResolvedValue(JSON.stringify({
            type: 'singleString',
          })) } as unknown as HttpRequest,
        } as unknown as OperationHttpHandlerInput;
        await expect(gateway.handle(input)).rejects.toThrow(BadRequestHttpError);
      },
    );

    it('should throw when the requested subscription type is not supported.', async(): Promise<void> => {
      const input = {
        request: { read: jest.fn().mockResolvedValue(JSON.stringify({
          type: [ 'UnsupportedType', 'AnotherUnsupportedType' ],
        })) } as unknown as HttpRequest,
      } as unknown as OperationHttpHandlerInput;
      await expect(gateway.handle(input)).rejects.toThrow(NotImplementedHttpError);
    });

    it('should return a valid response with the appropriate body.', async(): Promise<void> => {
      const input = {
        request: { read: jest.fn().mockResolvedValue(JSON.stringify({
          type: [ 'foo', 'bar' ],
        })) } as unknown as HttpRequest,
      } as unknown as OperationHttpHandlerInput;
      const response = gateway.handle(input);
      await expect(response).resolves.toBeDefined();
      const awaitedResponse = await response;
      expect(awaitedResponse.statusCode).toBe(200);
      expect(awaitedResponse.metadata?.contentType).toBe('application/ld+json');
      expect(JSON.parse(awaitedResponse.data?.read())).toMatchObject({
        '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
        notificationChannel: [
          { type: 'foo', endpoint: 'http://example.com/subscribe', features: []},
          { type: 'bar', endpoint: 'http://example.com/subscribe', features: []},
        ],
      });
    });
  });
});
