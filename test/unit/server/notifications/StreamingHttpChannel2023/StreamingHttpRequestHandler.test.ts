import { PassThrough } from 'node:stream';
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
  StreamingHttpRequestHandler,
} from '../../../../../src/server/notifications/StreamingHttpChannel2023/StreamingHttpRequestHandler';
import { AbsolutePathInteractionRoute, StreamingHttpMap } from '../../../../../src';
import type { NotificationGenerator, NotificationSerializer } from '../../../../../src';
import type { Notification } from '../../../../../src/server/notifications/Notification';
import { flushPromises } from '../../../../util/Util';

import * as GuardedStream from '../../../../../src/util/GuardedStream';

jest.mock('../../../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { error: jest.fn(), debug: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A StreamingHttpRequestHandler', (): void => {
  const logger: jest.Mocked<Logger> = getLoggerFor('mock') as any;
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const path = 'http://example.com/.notifications/StreamingHTTPChannel2023/';
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
  const chunk = 'notification';
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let representation: BasicRepresentation;
  let route: AbsolutePathInteractionRoute;
  let streamMap: StreamingHttpMap;
  let operation: Operation;
  let generator: jest.Mocked<NotificationGenerator>;
  let serializer: jest.Mocked<NotificationSerializer>;
  let credentialsExtractor: jest.Mocked<CredentialsExtractor>;
  let permissionReader: jest.Mocked<PermissionReader>;
  let authorizer: jest.Mocked<Authorizer>;
  let handler: StreamingHttpRequestHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: `${path}${encodeURIComponent(topic.path)}` },
      body: new BasicRepresentation(),
      preferences: {},
    };
    representation = new BasicRepresentation(chunk, 'text/plain');

    route = new AbsolutePathInteractionRoute(path);

    streamMap = new StreamingHttpMap();

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

    handler = new StreamingHttpRequestHandler(
      streamMap,
      route,
      generator,
      serializer,
      credentialsExtractor,
      permissionReader,
      authorizer,
    );
  });

  it('stores streams.', async(): Promise<void> => {
    await handler.handle({ operation, request, response });
    expect([ ...streamMap.keys() ]).toHaveLength(1);
    expect(streamMap.has(channel.topic)).toBe(true);
  });

  it('removes closed streams.', async(): Promise<void> => {
    const description = await handler.handle({ operation, request, response });
    expect(streamMap.has(channel.topic)).toBe(true);
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
    expect(description.metadata?.contentType).toBe('text/turtle');
  });

  it('responds with the stream.', async(): Promise<void> => {
    const description = await handler.handle({ operation, request, response });
    expect(description.data).toBeDefined();
  });

  it('sends initial notification in a single chunk.', async(): Promise<void> => {
    const mockStream = {
      write: jest.fn(),
      on: jest.fn(),
    } as unknown as GuardedStream.Guarded<PassThrough>;
    jest.spyOn(GuardedStream, 'guardStream').mockReturnValueOnce(mockStream);
    const serializationStream = new PassThrough();
    // Use two chunks for the serialization stream
    serializationStream.write('foo');
    serializationStream.end('bar');
    serializer = {
      handleSafe: jest.fn().mockResolvedValue({
        data: serializationStream,
      }),
    } as any;
    handler = new StreamingHttpRequestHandler(
      streamMap,
      route,
      generator,
      serializer,
      credentialsExtractor,
      permissionReader,
      authorizer,
    );
    await handler.handle({ operation, request, response });
    expect(mockStream.write).toHaveBeenCalledTimes(1);
    expect(mockStream.write).toHaveBeenCalledWith('foobar');
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
