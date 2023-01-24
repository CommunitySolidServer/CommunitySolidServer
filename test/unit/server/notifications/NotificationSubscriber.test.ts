import type { CredentialsExtractor } from '../../../../src/authentication/CredentialsExtractor';
import type { Authorizer } from '../../../../src/authorization/Authorizer';
import type { PermissionReader } from '../../../../src/authorization/PermissionReader';
import type { AccessMap } from '../../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { NOTIFICATION_CHANNEL_SCHEMA } from '../../../../src/server/notifications/NotificationChannel';
import type { NotificationChannelType } from '../../../../src/server/notifications/NotificationChannelType';
import { NotificationSubscriber } from '../../../../src/server/notifications/NotificationSubscriber';
import { UnprocessableEntityHttpError } from '../../../../src/util/errors/UnprocessableEntityHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../../src/util/map/IdentifierMap';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

describe('A NotificationSubscriber', (): void => {
  let channel: any;
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let operation: Operation;
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  let channelType: jest.Mocked<NotificationChannelType>;
  let credentialsExtractor: jest.Mocked<CredentialsExtractor>;
  let permissionReader: jest.Mocked<PermissionReader>;
  let authorizer: jest.Mocked<Authorizer>;
  let subscriber: NotificationSubscriber;

  beforeEach(async(): Promise<void> => {
    channel = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'NotificationChannelType',
      topic: topic.path,
    };

    operation = {
      method: 'POST',
      target: { path: 'http://example.com/.notifications/websockets/' },
      body: new BasicRepresentation(JSON.stringify(channel), 'application/ld+json'),
      preferences: {},
    };

    channelType = {
      type: 'NotificationChannelType',
      schema: NOTIFICATION_CHANNEL_SCHEMA,
      extractModes: jest.fn(async(subscription): Promise<AccessMap> =>
        new IdentifierSetMultiMap([[{ path: subscription.topic }, AccessMode.read ]]) as AccessMap),
      subscribe: jest.fn().mockResolvedValue({ response: new BasicRepresentation(), info: {}}),
    };

    credentialsExtractor = {
      handleSafe: jest.fn().mockResolvedValue({ public: {}}),
    } as any;

    permissionReader = {
      handleSafe: jest.fn().mockResolvedValue(new IdentifierMap([[ topic, AccessMode.read ]])),
    } as any;

    authorizer = {
      handleSafe: jest.fn(),
    } as any;

    subscriber = new NotificationSubscriber({ channelType, credentialsExtractor, permissionReader, authorizer });
  });

  it('requires the request to be JSON-LD.', async(): Promise<void> => {
    operation.body.metadata.contentType = 'text/turtle';

    await expect(subscriber.handle({ operation, request, response })).rejects.toThrow(UnsupportedMediaTypeHttpError);
  });

  it('errors if the request can not be parsed correctly.', async(): Promise<void> => {
    operation.body.data = guardedStreamFrom('not json');
    await expect(subscriber.handle({ operation, request, response })).rejects.toThrow(UnprocessableEntityHttpError);

    // Type is missing
    operation.body.data = guardedStreamFrom(JSON.stringify({
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      topic,
    }));
    await expect(subscriber.handle({ operation, request, response })).rejects.toThrow(UnprocessableEntityHttpError);
  });

  it('returns the representation generated by the subscribe call.', async(): Promise<void> => {
    const description = await subscriber.handle({ operation, request, response });
    expect(description.statusCode).toBe(200);
    const subscribeResult = await channelType.subscribe.mock.results[0].value;
    expect(description.data).toBe(subscribeResult.response.data);
    expect(description.metadata).toBe(subscribeResult.response.metadata);
  });

  it('errors on requests the Authorizer rejects.', async(): Promise<void> => {
    authorizer.handleSafe.mockRejectedValue(new Error('not allowed'));
    await expect(subscriber.handle({ operation, request, response })).rejects.toThrow('not allowed');
  });

  it('updates the channel expiration if a max is defined.', async(): Promise<void> => {
    jest.useFakeTimers();
    jest.setSystemTime();

    subscriber = new NotificationSubscriber({
      channelType,
      credentialsExtractor,
      permissionReader,
      authorizer,
      maxDuration: 60,
    });

    await subscriber.handle({ operation, request, response });
    expect(channelType.subscribe).toHaveBeenLastCalledWith(expect.objectContaining({
      endAt: Date.now() + (60 * 60 * 1000),
    }), { public: {}});

    operation.body.data = guardedStreamFrom(JSON.stringify({
      ...channel,
      endAt: new Date(Date.now() + 99999999999999).toISOString(),
    }));
    await subscriber.handle({ operation, request, response });
    expect(channelType.subscribe).toHaveBeenLastCalledWith(expect.objectContaining({
      endAt: Date.now() + (60 * 60 * 1000),
    }), { public: {}});

    operation.body.data = guardedStreamFrom(JSON.stringify({
      ...channel,
      endAt: new Date(Date.now() + 5).toISOString(),
    }));
    await subscriber.handle({ operation, request, response });
    expect(channelType.subscribe).toHaveBeenLastCalledWith(expect.objectContaining({
      endAt: Date.now() + 5,
    }), { public: {}});

    jest.useRealTimers();
  });
});
