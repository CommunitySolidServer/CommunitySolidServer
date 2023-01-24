import { v4 } from 'uuid';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { InternalServerError } from '../../util/errors/InternalServerError';
import type { ReadWriteLocker } from '../../util/locking/ReadWriteLocker';
import type { NotificationChannel } from './NotificationChannel';
import type { NotificationChannelInfo, NotificationChannelStorage } from './NotificationChannelStorage';

type StorageValue<T> = string | string[] | NotificationChannelInfo<T>;

/**
 * Stores all the {@link NotificationChannelInfo} in a {@link KeyValueStorage}.
 *
 * Uses a {@link ReadWriteLocker} to prevent internal race conditions.
 */
export class KeyValueChannelStorage<T extends Record<string, unknown>> implements NotificationChannelStorage<T> {
  protected logger = getLoggerFor(this);

  private readonly storage: KeyValueStorage<string, StorageValue<T>>;
  private readonly locker: ReadWriteLocker;

  public constructor(storage: KeyValueStorage<string, StorageValue<T>>, locker: ReadWriteLocker) {
    this.storage = storage;
    this.locker = locker;
  }

  public create(channel: NotificationChannel, features: T): NotificationChannelInfo<T> {
    return {
      id: `${channel.type}:${v4()}:${channel.topic}`,
      topic: channel.topic,
      type: channel.type,
      lastEmit: 0,
      startAt: channel.startAt,
      endAt: channel.endAt,
      accept: channel.accept,
      rate: channel.rate,
      state: channel.state,
      features,
    };
  }

  public async get(id: string): Promise<NotificationChannelInfo<T> | undefined> {
    const info = await this.storage.get(id);
    if (info && this.isChannelInfo(info)) {
      if (typeof info.endAt === 'number' && info.endAt < Date.now()) {
        this.logger.info(`Notification channel ${id} has expired.`);
        await this.locker.withWriteLock(this.getLockKey(id), async(): Promise<void> => {
          await this.deleteInfo(info);
        });
        return;
      }

      return info;
    }
  }

  public async getAll(topic: ResourceIdentifier): Promise<string[]> {
    const infos = await this.storage.get(topic.path);
    if (Array.isArray(infos)) {
      return infos;
    }
    return [];
  }

  public async add(info: NotificationChannelInfo<T>): Promise<void> {
    const target = { path: info.topic };
    return this.locker.withWriteLock(this.getLockKey(target), async(): Promise<void> => {
      const infos = await this.getAll(target);
      await this.storage.set(info.id, info);
      infos.push(info.id);
      await this.storage.set(info.topic, infos);
    });
  }

  public async update(info: NotificationChannelInfo<T>): Promise<void> {
    return this.locker.withWriteLock(this.getLockKey(info.id), async(): Promise<void> => {
      const oldInfo = await this.storage.get(info.id);

      if (oldInfo) {
        if (!this.isChannelInfo(oldInfo)) {
          throw new InternalServerError(`Trying to update ${info.id} which is not a NotificationChannelInfo.`);
        }
        if (info.topic !== oldInfo.topic) {
          throw new InternalServerError(`Trying to change the topic of a notification channel ${info.id}`);
        }
      }

      await this.storage.set(info.id, info);
    });
  }

  public async delete(id: string): Promise<void> {
    return this.locker.withWriteLock(this.getLockKey(id), async(): Promise<void> => {
      const info = await this.get(id);
      if (!info) {
        return;
      }
      await this.deleteInfo(info);
    });
  }

  /**
   * Utility function for deleting a specific {@link NotificationChannelInfo} object.
   * Does not create a lock on the info ID so should be wrapped in such a lock.
   */
  private async deleteInfo(info: NotificationChannelInfo): Promise<void> {
    await this.locker.withWriteLock(this.getLockKey(info.topic), async(): Promise<void> => {
      const infos = await this.getAll({ path: info.topic });
      const idx = infos.indexOf(info.id);
      // If idx < 0 we have an inconsistency
      if (idx < 0) {
        this.logger.error(`Channel info ${info.id} was not found in the list of info targeting ${info.topic}.`);
        this.logger.error('This should not happen and indicates a data consistency issue.');
      } else {
        infos.splice(idx, 1);
        if (infos.length > 0) {
          await this.storage.set(info.topic, infos);
        } else {
          await this.storage.delete(info.topic);
        }
      }
      await this.storage.delete(info.id);
    });
  }

  private isChannelInfo(value: StorageValue<T>): value is NotificationChannelInfo<T> {
    return Boolean((value as NotificationChannelInfo).id);
  }

  private getLockKey(identifier: ResourceIdentifier | string): ResourceIdentifier {
    return { path: `${typeof identifier === 'string' ? identifier : identifier.path}.notification-storage` };
  }
}
