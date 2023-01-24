import { v4 } from 'uuid';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { InternalServerError } from '../../util/errors/InternalServerError';
import type { ReadWriteLocker } from '../../util/locking/ReadWriteLocker';
import type { Subscription } from './Subscription';
import type { SubscriptionInfo, SubscriptionStorage } from './SubscriptionStorage';

type StorageValue<T> = string | string[] | SubscriptionInfo<T>;

/**
 * Stores all the {@link SubscriptionInfo} in a {@link KeyValueStorage}.
 *
 * Uses a {@link ReadWriteLocker} to prevent internal race conditions.
 */
export class KeyValueSubscriptionStorage<T extends Record<string, unknown>> implements SubscriptionStorage<T> {
  protected logger = getLoggerFor(this);

  private readonly storage: KeyValueStorage<string, StorageValue<T>>;
  private readonly locker: ReadWriteLocker;

  public constructor(storage: KeyValueStorage<string, StorageValue<T>>, locker: ReadWriteLocker) {
    this.storage = storage;
    this.locker = locker;
  }

  public create(subscription: Subscription, features: T): SubscriptionInfo<T> {
    return {
      id: `${subscription.type}:${v4()}:${subscription.topic}`,
      topic: subscription.topic,
      type: subscription.type,
      lastEmit: 0,
      startAt: subscription.startAt,
      endAt: subscription.endAt,
      accept: subscription.accept,
      rate: subscription.rate,
      state: subscription.state,
      features,
    };
  }

  public async get(id: string): Promise<SubscriptionInfo<T> | undefined> {
    const info = await this.storage.get(id);
    if (info && this.isSubscriptionInfo(info)) {
      if (typeof info.endAt === 'number' && info.endAt < Date.now()) {
        this.logger.info(`Subscription ${id} has expired.`);
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

  public async add(info: SubscriptionInfo<T>): Promise<void> {
    const target = { path: info.topic };
    return this.locker.withWriteLock(this.getLockKey(target), async(): Promise<void> => {
      const infos = await this.getAll(target);
      await this.storage.set(info.id, info);
      infos.push(info.id);
      await this.storage.set(info.topic, infos);
    });
  }

  public async update(info: SubscriptionInfo<T>): Promise<void> {
    return this.locker.withWriteLock(this.getLockKey(info.id), async(): Promise<void> => {
      const oldInfo = await this.storage.get(info.id);

      if (oldInfo) {
        if (!this.isSubscriptionInfo(oldInfo)) {
          throw new InternalServerError(`Trying to update ${info.id} which is not a SubscriptionInfo.`);
        }
        if (info.topic !== oldInfo.topic) {
          throw new InternalServerError(`Trying to change the topic of subscription ${info.id}`);
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
   * Utility function for deleting a specific {@link SubscriptionInfo} object.
   * Does not create a lock on the subscription ID so should be wrapped in such a lock.
   */
  private async deleteInfo(info: SubscriptionInfo): Promise<void> {
    await this.locker.withWriteLock(this.getLockKey(info.topic), async(): Promise<void> => {
      const infos = await this.getAll({ path: info.topic });
      const idx = infos.indexOf(info.id);
      // If idx < 0 we have an inconsistency
      if (idx < 0) {
        this.logger.error(`Subscription info ${info.id} was not found in the list of info targeting ${info.topic}.`);
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

  private isSubscriptionInfo(value: StorageValue<T>): value is SubscriptionInfo<T> {
    return Boolean((value as SubscriptionInfo).id);
  }

  private getLockKey(identifier: ResourceIdentifier | string): ResourceIdentifier {
    return { path: `${typeof identifier === 'string' ? identifier : identifier.path}.notification-storage` };
  }
}
