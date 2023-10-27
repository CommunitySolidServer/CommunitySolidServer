import { DataFactory, Store } from 'n3';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import {
  generateWebSocketUrl,
} from '../../../../../src/server/notifications/WebSocketChannel2023/WebSocket2023Util';
import type {
  WebSocketChannel2023,
} from '../../../../../src/server/notifications/WebSocketChannel2023/WebSocketChannel2023Type';
import {
  isWebSocket2023Channel,
  WebSocketChannel2023Type,
} from '../../../../../src/server/notifications/WebSocketChannel2023/WebSocketChannel2023Type';
import { NOTIFY, RDF } from '../../../../../src/util/Vocabularies';
import quad = DataFactory.quad;
import blankNode = DataFactory.blankNode;
import namedNode = DataFactory.namedNode;

jest.mock('uuid', (): any => ({ v4: (): string => '4c9b88c1-7502-4107-bb79-2a3a590c7aa3' }));

describe('A WebSocketChannel2023', (): void => {
  let data: Store;
  let channel: WebSocketChannel2023;
  const subject = blankNode();
  const topic = 'https://storage.example/resource';
  const route = new AbsolutePathInteractionRoute('http://example.com/foo');
  let channelType: WebSocketChannel2023Type;

  beforeEach(async(): Promise<void> => {
    data = new Store();
    data.addQuad(quad(subject, RDF.terms.type, NOTIFY.terms.WebSocketChannel2023));
    data.addQuad(quad(subject, NOTIFY.terms.topic, namedNode(topic)));

    const id = 'http://example.com/foo/4c9b88c1-7502-4107-bb79-2a3a590c7aa3';
    channel = {
      id,
      type: NOTIFY.WebSocketChannel2023,
      topic,
      receiveFrom: generateWebSocketUrl(id),
    };

    channelType = new WebSocketChannel2023Type(route);
  });

  it('exposes a utility function to verify if a channel is a websocket channel.', async(): Promise<void> => {
    expect(isWebSocket2023Channel(channel)).toBe(true);

    (channel as NotificationChannel).type = 'something else';
    expect(isWebSocket2023Channel(channel)).toBe(false);
  });

  it('correctly parses notification channel bodies.', async(): Promise<void> => {
    await expect(channelType.initChannel(data, {})).resolves.toEqual(channel);
  });
});
