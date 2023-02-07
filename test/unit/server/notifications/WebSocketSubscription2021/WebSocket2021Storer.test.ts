import { EventEmitter } from 'events';
import type { WebSocket } from 'ws';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type {
  NotificationChannelStorage,
} from '../../../../../src/server/notifications/NotificationChannelStorage';

import {
  WebSocket2021Storer,
} from '../../../../../src/server/notifications/WebSocketSubscription2021/WebSocket2021Storer';
import type { SetMultiMap } from '../../../../../src/util/map/SetMultiMap';
import { WrappedSetMultiMap } from '../../../../../src/util/map/WrappedSetMultiMap';
import { flushPromises } from '../../../../util/Util';

describe('A WebSocket2021Storer', (): void => {
  const channel: NotificationChannel = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
    features: {},
    lastEmit: 0,
  };
  let webSocket: jest.Mocked<WebSocket>;
  let storage: jest.Mocked<NotificationChannelStorage>;
  let socketMap: SetMultiMap<string, WebSocket>;
  let storer: WebSocket2021Storer;

  beforeEach(async(): Promise<void> => {
    webSocket = new EventEmitter() as any;
    webSocket.close = jest.fn();

    storage = {
      get: jest.fn(),
    } as any;

    socketMap = new WrappedSetMultiMap();

    storer = new WebSocket2021Storer(storage, socketMap);
  });

  it('stores WebSockets.', async(): Promise<void> => {
    await expect(storer.handle({ channel, webSocket })).resolves.toBeUndefined();
    expect([ ...socketMap.keys() ]).toHaveLength(1);
    expect(socketMap.has(channel.id)).toBe(true);
  });

  it('removes closed WebSockets.', async(): Promise<void> => {
    await expect(storer.handle({ channel, webSocket })).resolves.toBeUndefined();
    expect(socketMap.has(channel.id)).toBe(true);
    webSocket.emit('close');
    expect(socketMap.has(channel.id)).toBe(false);
  });

  it('removes erroring WebSockets.', async(): Promise<void> => {
    await expect(storer.handle({ channel, webSocket })).resolves.toBeUndefined();
    expect(socketMap.has(channel.id)).toBe(true);
    webSocket.emit('error');
    expect(socketMap.has(channel.id)).toBe(false);
  });

  it('removes expired WebSockets.', async(): Promise<void> => {
    jest.useFakeTimers();

    // Need to create class after fake timers have been enabled
    storer = new WebSocket2021Storer(storage, socketMap);

    const webSocket2: jest.Mocked<WebSocket> = new EventEmitter() as any;
    webSocket2.close = jest.fn();
    const webSocketOther: jest.Mocked<WebSocket> = new EventEmitter() as any;
    webSocketOther.close = jest.fn();
    const channelOther: NotificationChannel = {
      ...channel,
      id: 'other',
    };
    await expect(storer.handle({ channel, webSocket })).resolves.toBeUndefined();
    await expect(storer.handle({ channel, webSocket: webSocket2 })).resolves.toBeUndefined();
    await expect(storer.handle({ channel: channelOther, webSocket: webSocketOther })).resolves.toBeUndefined();

    // `channel` expired, `channelOther` did not
    storage.get.mockImplementation((id): any => {
      if (id === channelOther.id) {
        return channelOther;
      }
    });

    jest.advanceTimersToNextTimer();

    await flushPromises();

    expect(webSocket.close).toHaveBeenCalledTimes(1);
    expect(webSocket2.close).toHaveBeenCalledTimes(1);
    expect(webSocketOther.close).toHaveBeenCalledTimes(0);

    jest.useRealTimers();
  });
});
