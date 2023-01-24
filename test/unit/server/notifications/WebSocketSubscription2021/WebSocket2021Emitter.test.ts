import { EventEmitter } from 'events';
import type { WebSocket } from 'ws';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type {
  NotificationChannelInfo,
} from '../../../../../src/server/notifications/NotificationChannelStorage';
import {
  WebSocket2021Emitter,
} from '../../../../../src/server/notifications/WebSocketSubscription2021/WebSocket2021Emitter';
import type { SetMultiMap } from '../../../../../src/util/map/SetMultiMap';
import { WrappedSetMultiMap } from '../../../../../src/util/map/WrappedSetMultiMap';

describe('A WebSocket2021Emitter', (): void => {
  const info: NotificationChannelInfo = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
    features: {},
    lastEmit: 0,
  };

  let webSocket: jest.Mocked<WebSocket>;
  let socketMap: SetMultiMap<string, WebSocket>;
  let emitter: WebSocket2021Emitter;

  beforeEach(async(): Promise<void> => {
    webSocket = new EventEmitter() as any;
    webSocket.send = jest.fn();
    webSocket.close = jest.fn();

    socketMap = new WrappedSetMultiMap();

    emitter = new WebSocket2021Emitter(socketMap);
  });

  it('emits notifications to the stored WebSockets.', async(): Promise<void> => {
    socketMap.add(info.id, webSocket);

    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ info, representation })).resolves.toBeUndefined();
    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('notification');
  });

  it('destroys the representation if there is no matching WebSocket.', async(): Promise<void> => {
    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ info, representation })).resolves.toBeUndefined();
    expect(webSocket.send).toHaveBeenCalledTimes(0);
    expect(representation.data.destroyed).toBe(true);
  });

  it('can send to multiple matching WebSockets.', async(): Promise<void> => {
    const webSocket2: jest.Mocked<WebSocket> = new EventEmitter() as any;
    webSocket2.send = jest.fn();

    socketMap.add(info.id, webSocket);
    socketMap.add(info.id, webSocket2);

    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ info, representation })).resolves.toBeUndefined();
    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('notification');
    expect(webSocket2.send).toHaveBeenCalledTimes(1);
    expect(webSocket2.send).toHaveBeenLastCalledWith('notification');
  });

  it('only sends to the matching WebSockets.', async(): Promise<void> => {
    const webSocket2: jest.Mocked<WebSocket> = new EventEmitter() as any;
    webSocket2.send = jest.fn();
    const info2: NotificationChannelInfo = {
      ...info,
      id: 'other',
    };

    socketMap.add(info.id, webSocket);
    socketMap.add(info2.id, webSocket2);

    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ info, representation })).resolves.toBeUndefined();
    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('notification');
    expect(webSocket2.send).toHaveBeenCalledTimes(0);
  });
});
