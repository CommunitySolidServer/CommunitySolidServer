import { EventEmitter } from 'node:events';
import { getLoggerFor } from 'global-logger-factory';
import type { Logger } from 'global-logger-factory';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { KeyValueChannelStorage } from '../../../../src/server/notifications/KeyValueChannelStorage';
import type { NotificationChannel } from '../../../../src/server/notifications/NotificationChannel';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import type { ReadWriteLocker } from '../../../../src/util/locking/ReadWriteLocker';
import { flushPromises } from '../../../util/Util';
import resetAllMocks = jest.resetAllMocks;

jest.mock('global-logger-factory', (): any => {
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
    let mockInterval: jest.SpyInstance;

    beforeEach((): void => {
      jest.useFakeTimers();
      mockInterval = jest.spyOn(globalThis, 'setInterval');
      // Fixed jitter source so the scheduled delay is deterministic.
      jest.spyOn(globalThis.Math, 'random').mockReturnValue(0.5);
    });

    afterEach((): void => {
      jest.clearAllTimers();
      jest.restoreAllMocks();
      jest.useRealTimers();
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
      const timer = mockInterval.mock.results[0].value as NodeJS.Timeout;
      expect(timer.hasRef()).toBe(false);
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
        endAt: Date.now() + (2 * 60 * 1000),
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

      await jest.advanceTimersByTimeAsync(60 * 1000);

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

      const renewed = { ...channel, endAt: Date.now() + (2 * 60 * 1000) };
      jest.mocked(locker.withWriteLock).mockImplementation(async(
        rid: ResourceIdentifier,
        whileLocked: () => unknown,
      ): Promise<unknown> => {
        if (rid.path === `${channel.id}.notification-storage`) {
          internalMap.set(encodedId, renewed);
        }
        return whileLocked();
      });

      await jest.advanceTimersByTimeAsync(60 * 1000);

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

      await jest.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(entries).toHaveBeenCalledTimes(1);

      sweepGate.emit('release');
      await flushPromises();
      expect(internalMap.size).toBe(0);
      await jest.advanceTimersByTimeAsync(60 * 1000);
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
      await jest.advanceTimersByTimeAsync(60 * 1000);

      let finalized = false;
      const finalize = storage.finalize().then((): void => {
        finalized = true;
      });
      await flushPromises();
      expect(jest.getTimerCount()).toBe(0);
      expect(finalized).toBe(false);

      sweepGate.emit('release');
      await finalize;
      expect(finalized).toBe(true);
    });

    it('waits for an active deletion before finalization completes.', async(): Promise<void> => {
      const deletionGate = new EventEmitter();
      const holdDeletion = new Promise<void>((resolve): void => {
        deletionGate.once('release', resolve);
      });
      const deleteEntry = internalMap.delete.bind(internalMap);
      const deleteSpy = jest.spyOn(internalStorage, 'delete').mockImplementation(async(key): Promise<boolean> => {
        await holdDeletion;
        return deleteEntry(key);
      });
      channel.endAt = 0;
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      await storage.add(channel);
      await jest.advanceTimersByTimeAsync(60 * 1000);
      expect(deleteSpy).toHaveBeenCalledTimes(1);

      let finalized = false;
      const finalize = storage.finalize().then((): void => {
        finalized = true;
      });
      await flushPromises();
      expect(finalized).toBe(false);

      deletionGate.emit('release');
      await finalize;
      expect(finalized).toBe(true);
      expect(internalMap.size).toBe(0);
      expect(deleteSpy).toHaveBeenCalledTimes(2);
    });

    it('stops sweeping on finalize even when the process remains alive.', async(): Promise<void> => {
      const entries = jest.spyOn(internalStorage, 'entries');
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      // An unreferenced timer still fires while the event loop is running.
      await jest.advanceTimersByTimeAsync(60 * 1000);
      expect(entries).toHaveBeenCalledTimes(1);

      await expect(storage.finalize()).resolves.toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
      await jest.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(entries).toHaveBeenCalledTimes(1);
    });

    it('still finalizes if the active sweep fails.', async(): Promise<void> => {
      const sweepGate = new EventEmitter();
      const holdSweep = new Promise<void>((resolve): void => {
        sweepGate.once('release', resolve);
      });
      jest.spyOn(internalStorage, 'delete').mockImplementation(async(): Promise<boolean> => {
        await holdSweep;
        throw new Error('delete failed');
      });
      channel.endAt = 0;
      storage = new KeyValueChannelStorage(internalStorage, locker, 1, 0);
      await storage.add(channel);
      await jest.advanceTimersByTimeAsync(60 * 1000);

      const finalize = storage.finalize();
      sweepGate.emit('release');
      await expect(finalize).resolves.toBeUndefined();
      await flushPromises();
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Error during interval callback: Failed to sweep expired notification channels - delete failed',
      );
      expect(jest.getTimerCount()).toBe(0);
    });

    it('can finalize when the sweep is disabled.', async(): Promise<void> => {
      storage = new KeyValueChannelStorage(internalStorage, locker, 0);
      await expect(storage.finalize()).resolves.toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
