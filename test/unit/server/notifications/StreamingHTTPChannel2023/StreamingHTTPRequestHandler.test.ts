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

import {
  StreamingHTTPRequestHandler,
} from '../../../../../src/server/notifications/StreamingHTTPChannel2023/StreamingHTTPRequestHandler';
import { StreamingHTTPMap } from '../../../../../src';

/* eslint-disable jest/prefer-spy-on */
describe('A StreamingHTTPRequestHandler', (): void => {
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const pathPrefix = '.notifications/StreamingHTTPChannel2023/'
  const channel: NotificationChannel = {
    id: 'id',
    topic: topic.path,
    type: 'type',
  };
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let streamMap: StreamingHTTPMap
  let operation: Operation;
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

    credentialsExtractor = {
      handleSafe: jest.fn().mockResolvedValue({ public: {}}),
    } as any;

    permissionReader = {
      handleSafe: jest.fn().mockResolvedValue(new IdentifierMap([[ topic, AccessMode.read ]])),
    } as any;

    authorizer = {
      handleSafe: jest.fn(),
    } as any;

    handler = new StreamingHTTPRequestHandler(streamMap, pathPrefix, credentialsExtractor, permissionReader, authorizer);
  });

  it('stores streams.', async(): Promise<void> => {
    const description = await handler.handle({ operation, request, response });
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

  it('errors on requests the Authorizer rejects.', async(): Promise<void> => {
    authorizer.handleSafe.mockRejectedValue(new Error('not allowed'));
    await expect(handler.handle({ operation, request, response })).rejects.toThrow('not allowed');
  });
});
