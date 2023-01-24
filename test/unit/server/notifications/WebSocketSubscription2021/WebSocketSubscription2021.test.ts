import { AccessMode } from '../../../../../src/authorization/permissions/Permissions';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type { NotificationChannelStorage } from '../../../../../src/server/notifications/NotificationChannelStorage';
import {
  WebSocketSubscription2021,
} from '../../../../../src/server/notifications/WebSocketSubscription2021/WebSocketSubscription2021';
import { IdentifierSetMultiMap } from '../../../../../src/util/map/IdentifierMap';
import { readJsonStream } from '../../../../../src/util/StreamUtil';

describe('A WebSocketSubscription2021', (): void => {
  let channel: NotificationChannel;
  let storage: jest.Mocked<NotificationChannelStorage>;
  const route = new AbsolutePathInteractionRoute('http://example.com/foo');
  let channelType: WebSocketSubscription2021;

  beforeEach(async(): Promise<void> => {
    channel = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WebSocketSubscription2021',
      topic: 'https://storage.example/resource',
      state: undefined,
      startAt: undefined,
      endAt: undefined,
      accept: undefined,
      rate: undefined,
    };

    storage = {
      create: jest.fn().mockReturnValue({
        id: '123',
        topic: 'http://example.com/foo',
        type: 'WebSocketSubscription2021',
        lastEmit: 0,
        features: {},
      }),
      add: jest.fn(),
    } as any;

    channelType = new WebSocketSubscription2021(storage, route);
  });

  it('has the correct type.', async(): Promise<void> => {
    expect(channelType.type).toBe('WebSocketSubscription2021');
  });

  it('correctly parses notification channel bodies.', async(): Promise<void> => {
    await expect(channelType.schema.isValid(channel)).resolves.toBe(true);

    channel.type = 'something else';
    await expect(channelType.schema.isValid(channel)).resolves.toBe(false);
  });

  it('requires Read permissions on the topic.', async(): Promise<void> => {
    await expect(channelType.extractModes(channel)).resolves
      .toEqual(new IdentifierSetMultiMap([[{ path: channel.topic }, AccessMode.read ]]));
  });

  it('stores the info and returns a valid response when subscribing.', async(): Promise<void> => {
    const { response } = await channelType.subscribe(channel);
    expect(response.metadata.contentType).toBe('application/ld+json');
    await expect(readJsonStream(response.data)).resolves.toEqual({
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WebSocketSubscription2021',
      source: expect.stringMatching(/^ws:\/\/example.com\/foo\?auth=.+/u),
    });
  });
});
