import { EventEmitter } from 'node:events';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { Logger } from '../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../src/logging/LogUtil';
import { KeyValueChannelStorage } from '../../../../src/server/notifications/KeyValueChannelStorage';
import type { NotificationChannel } from '../../../../src/server/notifications/NotificationChannel';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import type { ReadWriteLocker } from '../../../../src/util/locking/ReadWriteLocker';
import { flushPromises } from '../../../util/Util';
import resetAllMocks = jest.resetAllMocks;

jest.mock('../../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A KeyValueChannelStorage', (): void => {
  const logger = getLoggerFor('mock');
  const topic = 'http://example.com/foo';
  const encodedTopic = encodeURIComponent(topic);
  const identifier = { path: topic };
  const id = 'http://example.com/.notifications/123465';
  const encodedId = encodeURIComponent(id);
  let channel: NotificationChannel;
  let internalMap: Map<string, any>;
  let internalStorage: KeyValueStorage<string, any>;
  let locker: ReadWriteLocker;
  let storage: KeyValueChannelStorage;

  beforeEach(async(): Promise<void> => {
    resetAllMocks();
    channel = {
      id,
      topic,
      type: 'WebSocketChannel2023',
    };

    internalMap = new Map();
    internalStorage = internalMap as any;

    locker = {
      withWriteLock: jest.fn(async <T>(rid: ResourceIdentifier, whileLocked: () => T | Promise<T>):
      Promise<T> => whileLocked()),
      withReadLock: jest.fn(),
    };

    // Disable the background sweep as it is tested separately
    storage = new KeyValueChannelStorage(internalStorage, locker, 0);
  });

  describe('#get', (): void => {
    it('returns undefined if there is no match.', async(): Promise<void> => {
      await expect(storage.get('notexists')).resolves.toBeUndefined();
    });

    it('returns the matching channel.', async(): Promise<void> => {
      await storage.add(channel);
      await expect(storage.get(channel.id)).resolves.toEqual(channel);
      expect(internalMap.get(encodedId)).toEqual(channel);
    });

    it('deletes expired channel.', async(): Promise<void> => {
      channel.endAt = 0;
      await storage.add(channel);
      await expect(storage.get(channel.id)).resolves.toBeUndefined();
      expect(internalMap.size).toBe(0);
    });
  });

  describe('#getAll', (): void => {
    it('returns an empty array if there is no match.', async(): Promise<void> => {
      await expect(storage.getAll(identifier)).resolves.toEqual([]);
    });

    it('returns the identifiers of all the matching channels.', async(): Promise<void> => {
      await storage.add(channel);
      await expect(storage.getAll(identifier)).resolves.toEqual([ channel.id ]);
    });
  });

  describe('#add', (): void => {
    it('adds the channel and adds its id to the topic collection.', async(): Promise<void> => {
      await expect(storage.add(channel)).resolves.toBeUndefined();
      expect(internalMap.size).toBe(2);
      expect([ ...internalMap.entries() ]).toEqual(expect.arrayContaining([
        [ encodedTopic, [ channel.id ]],
        [ encodedId, channel ],
      ]));
    });
  });

  describe('#update', (): void => {
    it('changes the channel.', async(): Promise<void> => {
      await storage.add(channel);
      const newChannel = {
        ...channel,
        state: '123456',
      };
      await expect(storage.update(newChannel)).resolves.toBeUndefined();
      expect([ ...internalMap.values() ]).toEqual(expect.arrayContaining([
        [ channel.id ],
        newChannel,
      ]));
    });

    it('rejects update requests that change the topic.', async(): Promise<void> => {
      await storage.add(channel);
      const newChannel = {
        ...channel,
        topic: 'http://example.com/other',
      };
      await expect(storage.update(newChannel)).rejects
        .toThrow(`Trying to change the topic of a notification channel ${channel.id}`);
    });

    it('rejects update request targeting a non-channel value.', async(): Promise<void> => {
      await storage.add(channel);
      const newChannel = {
        ...channel,
        id: topic,
      };
      await expect(storage.update(newChannel)).rejects
        .toThrow(`Trying to update ${topic} which is not a NotificationChannel.`);
    });

    it('restores the topic index if the channel was deleted before the update acquired its lock.', async():
    Promise<void> => {
      const newChannel = {
        ...channel,
        state: '123456',
      };
      await expect(storage.update(newChannel)).resolves.toBeUndefined();
      expect([ ...internalMap.entries() ]).toEqual(expect.arrayContaining([
        [ encodedTopic, [ channel.id ]],
        [ encodedId, newChannel ],
      ]));
    });
  });

  describe('#delete', (): void => {
    it('removes the channel and its reference.', async(): Promise<void> => {
      const channel2 = {
        ...channel,
        id: 'http://example.com/.notifications/9999999',
      };
      await storage.add(channel);
      await storage.add(channel2);
      expect(internalMap.size).toBe(3);
      await expect(storage.delete(channel.id)).resolves.toBe(true);
      expect(internalMap.size).toBe(2);
      expect([ ...internalMap.entries() ]).toEqual(expect.arrayContaining([
        [ encodedTopic, [ channel2.id ]],
        [ encodeURIComponent('http://example.com/.notifications/9999999'), channel2 ],
      ]));
    });

    it('removes the references for an identifier if the array is empty.', async(): Promise<void> => {
      await storage.add(channel);
      await expect(storage.delete(channel.id)).resolves.toBe(true);
      expect(internalMap.size).toBe(0);
    });

    it('does nothing if the target does not exist.', async(): Promise<void> => {
      await expect(storage.delete(channel.id)).resolves.toBe(false);
    });

    it('logs an error if the target can not be found in the list of references.', async(): Promise<void> => {
      await storage.add(channel);
      internalMap.set(encodedTopic, []);
      await expect(storage.delete(channel.id)).resolves.toBe(true);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('the background sweep', (): void => {
    // Disable the actual interval and simply check it was created with the correct parameters.
    // The registered callback is invoked manually to verify its behaviour.
    let mockInterval: jest.SpyInstance;
    let mockClear: jest.SpyInstance;
    let mockRandom: jest.SpyInstance;
    // We only need a stub timer with an `unref` function since we never let it fire on its own.
    let mockTimer: { unref: jest.Mock };

    beforeEach((): void => {
      mockTimer = { unref: jest.fn() };
      mockInterval = jest.spyOn(globalThis, 'setInterval')
        .mockImplementation(jest.fn().mockReturnValue(mockTimer));
      mockClear = jest.spyOn(globalThis, 'clearInterval').mockImplementation(jest.fn());
      // Fixed jitter source so the scheduled delay is deterministic.
      mockRandom = jest.spyOn(globalThis.Math, 'random').mockReturnValue(0.5);
    });

    afterEach((): void => {
      mockInterval.mockRestore();
      mockClear.mockRestore();
      mockRandom.mockRestore();
    });

    it('schedules the sweep on the configured interval when jitter is disabled.', (): void => {
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      expect(mockInterval).toHaveBeenCalledTimes(1);
      expect(mockInterval.mock.calls[0]).toHaveLength(2);
      expect(mockInterval.mock.calls[0][1]).toBe(60 * 1000);
    });

    it('uses a default 60 minute interval and jitter when none are configured.', (): void => {
      storage = new KeyValueChannelStorage(internalStorage, locker);
      expect(mockInterval).toHaveBeenCalledTimes(1);
      // Default period 60 min = 3600000 ms, plus default jitter floor(0.5 * 3600000 * 0.15) = 270000.
      expect(mockInterval.mock.calls[0][1]).toBe((60 * 60 * 1000) + 270000);
    });

    it('adds a jitter fraction to the scheduled sweep interval.', (): void => {
      // Math.random is 0.5 and jitter is 0.2, so floor(0.5 * 60000 * 0.2) = 6000 is added.
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0.2);
      expect(mockInterval).toHaveBeenCalledTimes(1);
      expect(mockInterval.mock.calls[0][1]).toBe((60 * 1000) + 6000);
    });

    it('unrefs the timer so it does not keep the event loop alive.', (): void => {
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      expect(mockTimer.unref).toHaveBeenCalledTimes(1);
    });

    it('does not schedule a sweep when the interval is 0.', (): void => {
      storage = new KeyValueChannelStorage(internalStorage, locker, 0);
      expect(mockInterval).toHaveBeenCalledTimes(0);
    });

    it('removes expired channels but keeps active and endless ones when it fires.', async(): Promise<void> => {
      const activeChannel: NotificationChannel = {
        id: 'http://example.com/.notifications/active',
        topic,
        type: 'WebSocketChannel2023',
        endAt: Date.now() + (60 * 1000),
      };
      const endlessChannel: NotificationChannel = {
        id: 'http://example.com/.notifications/endless',
        topic,
        type: 'WebSocketChannel2023',
      };
      channel.endAt = 0;
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      await storage.add(channel);
      await storage.add(activeChannel);
      await storage.add(endlessChannel);

      // Invoke the callback that was registered with the interval.
      await (mockInterval.mock.calls[0][0] as () => Promise<void>)();

      // The expired channel and its index reference are gone; the others remain.
      expect(internalMap.has(encodedId)).toBe(false);
      expect(internalMap.has(encodeURIComponent(activeChannel.id))).toBe(true);
      expect(internalMap.has(encodeURIComponent(endlessChannel.id))).toBe(true);
      expect(internalMap.get(encodedTopic)).toEqual([ activeChannel.id, endlessChannel.id ]);
    });

    it('keeps a channel that is renewed before its sweep lock is acquired.', async(): Promise<void> => {
      channel.endAt = 0;
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      await storage.add(channel);

      const renewed = { ...channel, endAt: Date.now() + (60 * 1000) };
      jest.mocked(locker.withWriteLock).mockImplementation(async(
        rid: ResourceIdentifier,
        whileLocked: () => unknown,
      ): Promise<unknown> => {
        if (rid.path === `${channel.id}.notification-storage`) {
          internalMap.set(encodedId, renewed);
        }
        return whileLocked();
      });

      await (mockInterval.mock.calls[0][0] as () => Promise<void>)();

      expect(internalMap.get(encodedId)).toEqual(renewed);
      expect(internalMap.get(encodedTopic)).toEqual([ channel.id ]);
    });

    it('does not start another sweep while one is active.', async(): Promise<void> => {
      const sweepGate = new EventEmitter();
      const holdSweep = new Promise<void>((resolve): void => {
        sweepGate.once('release', resolve);
      });
      const entries = jest.spyOn(internalStorage, 'entries').mockImplementation(async function* ():
      AsyncIterableIterator<[string, NotificationChannel]> {
        await holdSweep;
        yield [ encodedId, channel ];
      });
      channel.endAt = 0;
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      await storage.add(channel);
      const sweep = mockInterval.mock.calls[0][0] as () => Promise<void>;

      const firstSweep = sweep();
      const secondSweep = sweep();
      await flushPromises();
      expect(entries).toHaveBeenCalledTimes(1);

      sweepGate.emit('release');
      await Promise.all([ firstSweep, secondSweep ]);
      await sweep();
      expect(entries).toHaveBeenCalledTimes(2);
    });

    it('waits for the active sweep on finalize.', async(): Promise<void> => {
      const sweepGate = new EventEmitter();
      const holdSweep = new Promise<void>((resolve): void => {
        sweepGate.once('release', resolve);
      });
      jest.spyOn(internalStorage, 'entries').mockImplementation(async function* ():
      AsyncIterableIterator<[string, NotificationChannel]> {
        await holdSweep;
        yield [ encodedId, channel ];
      });
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      const sweep = (mockInterval.mock.calls[0][0] as () => Promise<void>)();
      await flushPromises();

      let finalized = false;
      const finalize = storage.finalize().then((): void => {
        finalized = true;
      });
      await flushPromises();
      expect(mockClear).toHaveBeenCalledWith(mockTimer);
      expect(finalized).toBe(false);

      sweepGate.emit('release');
      await Promise.all([ sweep, finalize ]);
      expect(finalized).toBe(true);
    });

    it('clears the timer on finalize.', async(): Promise<void> => {
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      await expect(storage.finalize()).resolves.toBeUndefined();
      expect(mockClear).toHaveBeenCalledTimes(1);
      expect(mockClear).toHaveBeenLastCalledWith(mockTimer);
    });

    it('does not clear a timer on finalize when the sweep is disabled.', async(): Promise<void> => {
      storage = new KeyValueChannelStorage(internalStorage, locker, 0);
      await expect(storage.finalize()).resolves.toBeUndefined();
      expect(mockClear).toHaveBeenCalledTimes(0);
    });
  });
});
