import type { CredentialsExtractor } from '../../../../src/authentication/CredentialsExtractor';
import type { Authorizer } from '../../../../src/authorization/Authorizer';
import type { PermissionReader } from '../../../../src/authorization/PermissionReader';
import type { AccessMap } from '../../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { Logger } from '../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../src/logging/LogUtil';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import type { NotificationChannel } from '../../../../src/server/notifications/NotificationChannel';
import type { NotificationChannelStorage } from '../../../../src/server/notifications/NotificationChannelStorage';
import type {
  NotificationChannelType,
  SubscriptionService,
} from '../../../../src/server/notifications/NotificationChannelType';
import { NotificationSubscriber } from '../../../../src/server/notifications/NotificationSubscriber';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { UnprocessableEntityHttpError } from '../../../../src/util/errors/UnprocessableEntityHttpError';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../../src/util/map/IdentifierMap';
import { readableToString } from '../../../../src/util/StreamUtil';
import { flushPromises } from '../../../util/Util';

jest.mock('../../../../src/logging/LogUtil', (): any => {
  const logger: Logger =
    { debug: jest.fn(), error: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A NotificationSubscriber', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let operation: Operation;
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const subscriptionService: SubscriptionService = {
    '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
    id: 'http://example.com/subscription/',
    channelType: 'DummyType',
    feature: [ 'rate' ],
  };
  let channel: NotificationChannel;
  let channelType: jest.Mocked<NotificationChannelType>;
  let converter: jest.Mocked<RepresentationConverter>;
  let credentialsExtractor: jest.Mocked<CredentialsExtractor>;
  let permissionReader: jest.Mocked<PermissionReader>;
  let authorizer: jest.Mocked<Authorizer>;
  let storage: jest.Mocked<NotificationChannelStorage>;
  let subscriber: NotificationSubscriber;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'POST',
      target: { path: 'http://example.com/.notifications/websockets/' },
      body: new BasicRepresentation(),
      preferences: {},
    };

    channel = {
      type: 'NotificationChannelType',
      topic: topic.path,
      id: '123456',
    };

    channelType = {
      getDescription: jest.fn().mockReturnValue(subscriptionService),
      initChannel: jest.fn().mockResolvedValue(channel),
      toJsonLd: jest.fn().mockResolvedValue({}),
      extractModes: jest.fn(async(subscription): Promise<AccessMap> =>
        new IdentifierSetMultiMap([[{ path: subscription.topic }, AccessMode.read ]]) as AccessMap),
      completeChannel: jest.fn(),
    };

    converter = {
      handleSafe: jest.fn().mockResolvedValue(new BasicRepresentation([], INTERNAL_QUADS)),
    } as any;

    credentialsExtractor = {
      handleSafe: jest.fn().mockResolvedValue({ public: {}}),
    } as any;

    permissionReader = {
      handleSafe: jest.fn().mockResolvedValue(new IdentifierMap([[ topic, AccessMode.read ]])),
    } as any;

    authorizer = {
      handleSafe: jest.fn(),
    } as any;

    storage = {
      add: jest.fn(),
    } as any;

    subscriber = new NotificationSubscriber(
      { channelType, converter, credentialsExtractor, permissionReader, authorizer, storage },
    );
  });

  it('returns a subscription service description on GET requests.', async(): Promise<void> => {
    operation.method = 'GET';
    const description = await subscriber.handle({ operation, request, response });
    expect(description.statusCode).toBe(200);
    expect(description.metadata?.contentType).toBe('application/ld+json');
    expect(JSON.parse(await readableToString(description.data!))).toEqual(subscriptionService);
  });

  it('only returns metadata on HEAD requests.', async(): Promise<void> => {
    operation.method = 'HEAD';
    const description = await subscriber.handle({ operation, request, response });
    expect(description.statusCode).toBe(200);
    expect(description.metadata?.contentType).toBe('application/ld+json');
    expect(description.data).toBeUndefined();
  });

  it('errors if the request can not be parsed correctly.', async(): Promise<void> => {
    converter.handleSafe.mockRejectedValueOnce(new Error('bad data'));
    await expect(subscriber.handle({ operation, request, response })).rejects.toThrow('bad data');
    expect(storage.add).toHaveBeenCalledTimes(0);
  });

  it('errors if the channel type rejects the input.', async(): Promise<void> => {
    channelType.initChannel.mockRejectedValueOnce(new Error('bad data'));
    await expect(subscriber.handle({ operation, request, response })).rejects.toThrow(UnprocessableEntityHttpError);
    expect(storage.add).toHaveBeenCalledTimes(0);
  });

  it('returns the JSON generated by the channel type.', async(): Promise<void> => {
    const description = await subscriber.handle({ operation, request, response });
    expect(description.statusCode).toBe(200);
    expect(JSON.parse(await readableToString(description.data!))).toEqual({});
    expect(description.metadata?.contentType).toBe('application/ld+json');
    expect(storage.add).toHaveBeenCalledTimes(1);
    expect(storage.add).toHaveBeenLastCalledWith(channel);
  });

  it('errors on requests the Authorizer rejects.', async(): Promise<void> => {
    authorizer.handleSafe.mockRejectedValue(new Error('not allowed'));
    await expect(subscriber.handle({ operation, request, response })).rejects.toThrow('not allowed');
    expect(storage.add).toHaveBeenCalledTimes(0);
  });

  it('updates the channel expiration if a max is defined.', async(): Promise<void> => {
    jest.useFakeTimers();
    jest.setSystemTime();

    subscriber = new NotificationSubscriber({
      channelType,
      converter,
      credentialsExtractor,
      permissionReader,
      authorizer,
      storage,
      maxDuration: 60,
    });

    await subscriber.handle({ operation, request, response });
    expect(storage.add).toHaveBeenCalledTimes(1);
    expect(storage.add).toHaveBeenLastCalledWith({
      ...channel,
      endAt: Date.now() + (60 * 60 * 1000),
    });

    converter.handleSafe.mockResolvedValue(new BasicRepresentation());
    channelType.initChannel.mockResolvedValueOnce({ ...channel, endAt: Date.now() + 99999999999999 });
    await subscriber.handle({ operation, request, response });
    expect(storage.add).toHaveBeenCalledTimes(2);
    expect(storage.add).toHaveBeenLastCalledWith({
      ...channel,
      endAt: Date.now() + (60 * 60 * 1000),
    });

    converter.handleSafe.mockResolvedValue(new BasicRepresentation());
    channelType.initChannel.mockResolvedValueOnce({ ...channel, endAt: Date.now() + 5 });
    await subscriber.handle({ operation, request, response });
    expect(storage.add).toHaveBeenCalledTimes(3);
    expect(storage.add).toHaveBeenLastCalledWith({
      ...channel,
      endAt: Date.now() + 5,
    });

    jest.useRealTimers();
  });

  it('calls the completeChannel function after sending the response.', async(): Promise<void> => {
    const description = await subscriber.handle({ operation, request, response });

    // Read out data to end stream correctly
    await readableToString(description.data!);
    await flushPromises();

    expect(channelType.completeChannel).toHaveBeenCalledTimes(1);
  });

  it('logs an error if the completeChannel functions throws.', async(): Promise<void> => {
    const logger = getLoggerFor('mock');
    channelType.completeChannel.mockRejectedValue(new Error('notification error'));

    const description = await subscriber.handle({ operation, request, response });

    // Read out data to end stream correctly
    await readableToString(description.data!);
    await flushPromises();

    expect(channelType.completeChannel).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error)
      .toHaveBeenLastCalledWith(`There was an issue completing notification channel ${channel.id}: notification error`);
  });
});
