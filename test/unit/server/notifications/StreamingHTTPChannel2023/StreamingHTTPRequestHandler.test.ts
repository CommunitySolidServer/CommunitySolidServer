import type { CredentialsExtractor } from '../../../../../src/authentication/CredentialsExtractor';
import type { Authorizer } from '../../../../../src/authorization/Authorizer';
import type { PermissionReader } from '../../../../../src/authorization/PermissionReader';
import { IdentifierMap } from '../../../../../src/util/map/IdentifierMap';
import { AccessMode } from '../../../../../src/authorization/permissions/Permissions';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import type { Operation } from '../../../../../src/http/Operation';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { Logger } from '../../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../../src/logging/LogUtil';

import {
  StreamingHTTPRequestHandler,
} from '../../../../../src/server/notifications/StreamingHTTPChannel2023/StreamingHTTPRequestHandler';
import { NotificationGenerator, NotificationSerializer, StreamingHTTPMap } from '../../../../../src';
import type { Notification } from '../../../../../src/server/notifications/Notification';
import { flushPromises } from '../../../../util/Util';

jest.mock('../../../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { error: jest.fn(), debug: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

/* eslint-disable jest/prefer-spy-on */
describe('A StreamingHTTPRequestHandler', (): void => {
  const logger: jest.Mocked<Logger> = getLoggerFor('mock') as any;
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const pathPrefix = '.notifications/StreamingHTTPChannel2023/'
  const channel: NotificationChannel = {
    id: 'id',
    topic: topic.path,
    type: 'type',
  };
  const notification: Notification = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://www.w3.org/ns/solid/notification/v1',
    ],
    id: `urn:123:http://example.com/foo`,
    type: 'Update',
    object: 'http://example.com/foo',
    published: '123',
    state: '"123456-text/turtle"',
  };
  const representation = new BasicRepresentation();
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let streamMap: StreamingHTTPMap
  let operation: Operation;
  let generator: jest.Mocked<NotificationGenerator>;
  let serializer: jest.Mocked<NotificationSerializer>;
  let credentialsExtractor: jest.Mocked<CredentialsExtractor>;
  let permissionReader: jest.Mocked<PermissionReader>;
  let authorizer: jest.Mocked<Authorizer>;
  let handler: StreamingHTTPRequestHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: 'http://example.com/.notifications/StreamingHTTPChannel2023/foo' },
      body: new BasicRepresentation(),
      preferences: {},
    };

    streamMap = new StreamingHTTPMap();

    generator = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(notification),
    } as any;

    serializer = {
      handleSafe: jest.fn().mockResolvedValue(representation),
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

    handler = new StreamingHTTPRequestHandler(streamMap, pathPrefix, generator, serializer, credentialsExtractor, permissionReader, authorizer);
  });

  it('stores streams.', async(): Promise<void> => {
    await handler.handle({ operation, request, response });
    expect([ ...streamMap.keys() ]).toHaveLength(1);
    expect(streamMap.has(channel.topic)).toBe(true);
  });

  it('removes closed streams.', async(): Promise<void> => {
    const description = await handler.handle({ operation, request, response });
    expect(streamMap.has(channel.topic)).toBe(true)
    description.data!.emit('close');
    expect(streamMap.has(channel.topic)).toBe(false);
  });

  it('removes erroring streams.', async(): Promise<void> => {
    const description = await handler.handle({ operation, request, response });
    expect(streamMap.has(channel.topic)).toBe(true);
    description.data!.emit('error');
    expect(streamMap.has(channel.topic)).toBe(false);
  });

  it('sets content type to turtle.', async(): Promise<void> => {
    const description = await handler.handle({ operation, request, response });
    expect(description.metadata?.contentType).toBe('text/turtle')
  });

  it('responds with the stream.', async(): Promise<void> => {
    const description = await handler.handle({ operation, request, response });
    expect(description.data).toBeDefined()
  });

  it('sends initial notification.', async(): Promise<void> => {
    const spy = jest.spyOn(representation.data, 'pipe')
    await handler.handle({ operation, request, response });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('logs an error if sending initial notification fails.', async(): Promise<void> => {
    serializer.handleSafe.mockRejectedValueOnce(new Error('failed'));
    await handler.handle({ operation, request, response });
    await flushPromises();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(`Problem emitting initial notification: failed`);
  });

  it('errors on requests the Authorizer rejects.', async(): Promise<void> => {
    authorizer.handleSafe.mockRejectedValue(new Error('not allowed'));
    await expect(handler.handle({ operation, request, response })).rejects.toThrow('not allowed');
  });
});
