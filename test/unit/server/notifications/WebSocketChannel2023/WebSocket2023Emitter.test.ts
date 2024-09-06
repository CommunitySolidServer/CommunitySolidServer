import type { WebSocket } from 'ws';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import {
  WebSocket2023Emitter,
} from '../../../../../src/server/notifications/WebSocketChannel2023/WebSocket2023Emitter';
import type { SetMultiMap } from '../../../../../src/util/map/SetMultiMap';
import { WrappedSetMultiMap } from '../../../../../src/util/map/WrappedSetMultiMap';

describe('A WebSocket2023Emitter', (): void => {
  const channel: NotificationChannel = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
  };

  let webSocket: jest.Mocked<WebSocket>;
  let socketMap: SetMultiMap<string, WebSocket>;
  let emitter: WebSocket2023Emitter;

  beforeEach(async(): Promise<void> => {
    webSocket = {
      send: jest.fn(),
    } as any;

    socketMap = new WrappedSetMultiMap();

    emitter = new WebSocket2023Emitter(socketMap);
  });

  it('emits notifications to the stored WebSockets.', async(): Promise<void> => {
    socketMap.add(channel.id, webSocket);

    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('notification');
  });

  it('destroys the representation if there is no matching WebSocket.', async(): Promise<void> => {
    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(webSocket.send).toHaveBeenCalledTimes(0);
    expect(representation.data.destroyed).toBe(true);
  });

  it('can send to multiple matching WebSockets.', async(): Promise<void> => {
    const webSocket2: jest.Mocked<WebSocket> = {
      send: jest.fn(),
    } as any;

    socketMap.add(channel.id, webSocket);
    socketMap.add(channel.id, webSocket2);

    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('notification');
    expect(webSocket2.send).toHaveBeenCalledTimes(1);
    expect(webSocket2.send).toHaveBeenLastCalledWith('notification');
  });

  it('only sends to the matching WebSockets.', async(): Promise<void> => {
    const webSocket2: jest.Mocked<WebSocket> = {
      send: jest.fn(),
    } as any;
    const channel2: NotificationChannel = {
      ...channel,
      id: 'other',
    };

    socketMap.add(channel.id, webSocket);
    socketMap.add(channel2.id, webSocket2);

    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('notification');
    expect(webSocket2.send).toHaveBeenCalledTimes(0);
  });
});
