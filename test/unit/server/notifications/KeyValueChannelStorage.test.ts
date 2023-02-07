import { v4 } from 'uuid';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { Logger } from '../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../src/logging/LogUtil';
import { KeyValueChannelStorage } from '../../../../src/server/notifications/KeyValueChannelStorage';
import type {
  NotificationChannel,
  NotificationChannelJson,
} from '../../../../src/server/notifications/NotificationChannel';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import type { ReadWriteLocker } from '../../../../src/util/locking/ReadWriteLocker';
import resetAllMocks = jest.resetAllMocks;

jest.mock('uuid', (): any => ({ v4: (): string => '4c9b88c1-7502-4107-bb79-2a3a590c7aa3' }));
jest.mock('../../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { info: jest.fn(), error: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A KeyValueChannelStorage', (): void => {
  const logger = getLoggerFor('mock');
  const topic = 'http://example.com/foo';
  const identifier = { path: topic };
  const json = {
    '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
    type: 'WebSocketSubscription2021',
    topic,
  } as NotificationChannelJson;
  const features = { aa: 'bb' };
  let channel: NotificationChannel<Record<string, string>>;
  let internalMap: Map<string, any>;
  let internalStorage: KeyValueStorage<string, any>;
  let locker: ReadWriteLocker;
  let storage: KeyValueChannelStorage<Record<string, string>>;

  beforeEach(async(): Promise<void> => {
    resetAllMocks();
    channel = {
      id: `WebSocketSubscription2021:${v4()}:http://example.com/foo`,
      topic,
      type: 'WebSocketSubscription2021',
      features,
      lastEmit: 0,
    };

    internalMap = new Map();
    internalStorage = internalMap as any;

    locker = {
      withWriteLock: jest.fn(async <T,>(id: ResourceIdentifier, whileLocked: () => T | Promise<T>):
      Promise<T> => whileLocked()),
      withReadLock: jest.fn(),
    };

    storage = new KeyValueChannelStorage(internalStorage, locker);
  });

  describe('#create', (): void => {
    it('creates channel based on a notification channel.', async(): Promise<void> => {
      expect(storage.create(json, features)).toEqual(channel);
    });
  });

  describe('#get', (): void => {
    it('returns undefined if there is no match.', async(): Promise<void> => {
      await expect(storage.get('notexists')).resolves.toBeUndefined();
    });

    it('returns the matching channel.', async(): Promise<void> => {
      await storage.add(channel);
      await expect(storage.get(channel.id)).resolves.toEqual(channel);
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
      expect([ ...internalMap.values() ]).toEqual(expect.arrayContaining([
        [ channel.id ],
        channel,
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
      // Looking for the key so this test doesn't depend on the internal keys used
      const id = [ ...internalMap.entries() ].find((entry): boolean => Array.isArray(entry[1]))![0];
      const newChannel = {
        ...channel,
        id,
      };
      await expect(storage.update(newChannel)).rejects
        .toThrow(`Trying to update ${id} which is not a NotificationChannel.`);
    });
  });

  describe('#delete', (): void => {
    it('removes the channel and its reference.', async(): Promise<void> => {
      const channel2 = {
        ...channel,
        id: 'differentId',
      };
      await storage.add(channel);
      await storage.add(channel2);
      expect(internalMap.size).toBe(3);
      await expect(storage.delete(channel.id)).resolves.toBeUndefined();
      expect(internalMap.size).toBe(2);
      expect([ ...internalMap.values() ]).toEqual(expect.arrayContaining([
        [ channel2.id ],
        channel2,
      ]));
    });

    it('removes the references for an identifier if the array is empty.', async(): Promise<void> => {
      await storage.add(channel);
      await expect(storage.delete(channel.id)).resolves.toBeUndefined();
      expect(internalMap.size).toBe(0);
    });

    it('does nothing if the target does not exist.', async(): Promise<void> => {
      await expect(storage.delete(channel.id)).resolves.toBeUndefined();
    });

    it('logs an error if the target can not be found in the list of references.', async(): Promise<void> => {
      await storage.add(channel);
      // Looking for the key so this test doesn't depend on the internal keys used
      const id = [ ...internalMap.entries() ].find((entry): boolean => Array.isArray(entry[1]))![0];
      internalMap.set(id, []);
      await expect(storage.delete(channel.id)).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });
});
