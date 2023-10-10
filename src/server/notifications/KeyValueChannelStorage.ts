import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { InternalServerError } from '../../util/errors/InternalServerError';
import type { ReadWriteLocker } from '../../util/locking/ReadWriteLocker';
import type { NotificationChannel } from './NotificationChannel';
import type { NotificationChannelStorage } from './NotificationChannelStorage';

type StorageValue = string | string[] | NotificationChannel;

/**
 * Stores all the {@link NotificationChannel} in a {@link KeyValueStorage}.
 * Encodes IDs/topics before storing them in the KeyValueStorage.
 *
 * Uses a {@link ReadWriteLocker} to prevent internal race conditions.
 */
export class KeyValueChannelStorage implements NotificationChannelStorage {
  protected logger = getLoggerFor(this);

  private readonly storage: KeyValueStorage<string, StorageValue>;
  private readonly locker: ReadWriteLocker;

  public constructor(storage: KeyValueStorage<string, StorageValue>, locker: ReadWriteLocker) {
    this.storage = storage;
    this.locker = locker;
  }

  public async get(id: string): Promise<NotificationChannel | undefined> {
    const channel = await this.storage.get(encodeURIComponent(id));
    if (channel && this.isChannel(channel)) {
      if (typeof channel.endAt === 'number' && channel.endAt < Date.now()) {
        this.logger.info(`Notification channel ${id} has expired.`);
        await this.locker.withWriteLock(this.getLockKey(id), async(): Promise<void> => {
          await this.deleteChannel(channel);
        });
        return;
      }

      return channel;
    }
  }

  public async getAll(topic: ResourceIdentifier): Promise<string[]> {
    const channels = await this.storage.get(encodeURIComponent(topic.path));
    if (Array.isArray(channels)) {
      return channels;
    }
    return [];
  }

  public async add(channel: NotificationChannel): Promise<void> {
    const target = { path: channel.topic };
    return this.locker.withWriteLock(this.getLockKey(target), async(): Promise<void> => {
      const channels = await this.getAll(target);
      await this.storage.set(encodeURIComponent(channel.id), channel);
      channels.push(channel.id);
      await this.storage.set(encodeURIComponent(channel.topic), channels);
    });
  }

  public async update(channel: NotificationChannel): Promise<void> {
    return this.locker.withWriteLock(this.getLockKey(channel.id), async(): Promise<void> => {
      const oldChannel = await this.storage.get(encodeURIComponent(channel.id));

      if (oldChannel) {
        if (!this.isChannel(oldChannel)) {
          throw new InternalServerError(`Trying to update ${channel.id} which is not a NotificationChannel.`);
        }
        if (channel.topic !== oldChannel.topic) {
          throw new InternalServerError(`Trying to change the topic of a notification channel ${channel.id}`);
        }
      }

      await this.storage.set(encodeURIComponent(channel.id), channel);
    });
  }

  public async delete(id: string): Promise<boolean> {
    return this.locker.withWriteLock(this.getLockKey(id), async(): Promise<boolean> => {
      const channel = await this.get(id);
      if (!channel) {
        return false;
      }
      await this.deleteChannel(channel);
      return true;
    });
  }

  /**
   * Utility function for deleting a specific {@link NotificationChannel} object.
   * Does not create a lock on the channel ID so should be wrapped in such a lock.
   */
  private async deleteChannel(channel: NotificationChannel): Promise<void> {
    await this.locker.withWriteLock(this.getLockKey(channel.topic), async(): Promise<void> => {
      const channels = await this.getAll({ path: channel.topic });
      const idx = channels.indexOf(channel.id);
      // If idx < 0 we have an inconsistency
      if (idx < 0) {
        this.logger.error(`Channel ${channel.id} was not found in the list of channels targeting ${channel.topic}.`);
        this.logger.error('This should not happen and indicates a data consistency issue.');
      } else {
        channels.splice(idx, 1);
        if (channels.length > 0) {
          await this.storage.set(encodeURIComponent(channel.topic), channels);
        } else {
          await this.storage.delete(encodeURIComponent(channel.topic));
        }
      }
      await this.storage.delete(encodeURIComponent(channel.id));
    });
  }

  private isChannel(value: StorageValue): value is NotificationChannel {
    return Boolean((value as NotificationChannel).id);
  }

  private getLockKey(identifier: ResourceIdentifier | string): ResourceIdentifier {
    return { path: `${typeof identifier === 'string' ? identifier : identifier.path}.notification-storage` };
  }
}
