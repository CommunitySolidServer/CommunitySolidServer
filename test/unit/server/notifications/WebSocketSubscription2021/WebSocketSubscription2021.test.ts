import { DataFactory, Store } from 'n3';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';

import {
  generateWebSocketUrl,
} from '../../../../../src/server/notifications/WebSocketSubscription2021/WebSocket2021Util';
import type {
  WebSocketSubscription2021Channel,
} from '../../../../../src/server/notifications/WebSocketSubscription2021/WebSocketSubscription2021';
import {
  isWebSocket2021Channel,
  WebSocketSubscription2021,
} from '../../../../../src/server/notifications/WebSocketSubscription2021/WebSocketSubscription2021';
import { NOTIFY, RDF } from '../../../../../src/util/Vocabularies';
import quad = DataFactory.quad;
import blankNode = DataFactory.blankNode;
import namedNode = DataFactory.namedNode;

jest.mock('uuid', (): any => ({ v4: (): string => '4c9b88c1-7502-4107-bb79-2a3a590c7aa3' }));

describe('A WebSocketSubscription2021', (): void => {
  let data: Store;
  let channel: WebSocketSubscription2021Channel;
  const subject = blankNode();
  const topic = 'https://storage.example/resource';
  const route = new AbsolutePathInteractionRoute('http://example.com/foo');
  let channelType: WebSocketSubscription2021;

  beforeEach(async(): Promise<void> => {
    data = new Store();
    data.addQuad(quad(subject, RDF.terms.type, NOTIFY.terms.WebSocketSubscription2021));
    data.addQuad(quad(subject, NOTIFY.terms.topic, namedNode(topic)));

    const id = 'http://example.com/foo/4c9b88c1-7502-4107-bb79-2a3a590c7aa3';
    channel = {
      id,
      type: NOTIFY.WebSocketSubscription2021,
      topic,
      source: generateWebSocketUrl(route.getPath(), id),
    };

    channelType = new WebSocketSubscription2021(route);
  });

  it('exposes a utility function to verify if a channel is a websocket channel.', async(): Promise<void> => {
    expect(isWebSocket2021Channel(channel)).toBe(true);

    (channel as NotificationChannel).type = 'something else';
    expect(isWebSocket2021Channel(channel)).toBe(false);
  });

  it('correctly parses notification channel bodies.', async(): Promise<void> => {
    await expect(channelType.initChannel(data, {})).resolves.toEqual(channel);
  });
});
