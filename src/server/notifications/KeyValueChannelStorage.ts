import { getLoggerFor } from 'global-logger-factory';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Finalizable } from '../../init/final/Finalizable';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { InternalServerError } from '../../util/errors/InternalServerError';
import type { ReadWriteLocker } from '../../util/locking/ReadWriteLocker';
import { setSafeInterval } from '../../util/TimerUtil';
import type { NotificationChannel } from './NotificationChannel';
import type { NotificationChannelStorage } from './NotificationChannelStorage';

type StorageValue = string | string[] | NotificationChannel;

/**
 * Stores all the {@link NotificationChannel} in a {@link KeyValueStorage}.
 * Encodes IDs/topics before storing them in the KeyValueStorage.
 *
 * Uses a {@link ReadWriteLocker} to prevent internal race conditions.
 *
 * Expired channels are deleted when they are requested through `get`.
 * A timer additionally deletes all expired channels periodically,
 * since channels that are never requested again would otherwise remain in the storage.
 */
export class KeyValueChannelStorage implements NotificationChannelStorage, Finalizable {
  protected logger = getLoggerFor(this);

  private readonly storage: KeyValueStorage<string, StorageValue>;
  private readonly locker: ReadWriteLocker;
  private readonly timer?: NodeJS.Timeout;
  private activeSweep?: Promise<void>;

  /**
   * @param storage - Where to store the channels.
   * @param locker - Used to prevent internal race conditions.
   * @param sweepInterval - How often the expired channels need to be deleted, in minutes. `0` disables the sweep.
   * @param jitter - Maximum random fraction of `sweepInterval` that is added to the interval,
   *                 so multiple instances do not all sweep at the same time.
   */
  public constructor(
    storage: KeyValueStorage<string, StorageValue>,
    locker: ReadWriteLocker,
    sweepInterval = 60,
    jitter = 0.15,
  ) {
    this.storage = storage;
    this.locker = locker;

    if (sweepInterval > 0) {
      const period = sweepInterval * 60 * 1000;
      const jitterMs = Math.floor(Math.random() * period * jitter);
      this.timer = setSafeInterval(
        this.logger,
        'Failed to sweep expired notification channels',
        this.sweepExpiredChannels.bind(this),
        period + jitterMs,
      );
      this.timer.unref();
    }
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
      } else {
        // The channel might have been deleted while this update was waiting for its lock.
        // Adding it again also restores its topic index entry.
        await this.add(channel);
        return;
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

  /**
   * Runs the expiry sweep as a single-flight operation.
   */
  private async sweepExpiredChannels(): Promise<void> {
    if (!this.activeSweep) {
      this.activeSweep = this.performSweep().finally((): void => {
        this.activeSweep = undefined;
      });
    }
    await this.activeSweep;
  }

  /**
   * Deletes all channels that have expired.
   */
  private async performSweep(): Promise<void> {
    this.logger.debug('Sweeping expired notification channels.');
    const expired: string[] = [];
    let removed = 0;
    // Not deleting while iterating to prevent iterator issues
    for await (const [ , value ] of this.storage.entries()) {
      if (this.isChannel(value) && typeof value.endAt === 'number' && value.endAt < Date.now()) {
        expired.push(value.id);
      }
    }
    for (const id of expired) {
      await this.locker.withWriteLock(this.getLockKey(id), async(): Promise<void> => {
        const channel = await this.storage.get(encodeURIComponent(id));
        if (channel && this.isChannel(channel) && typeof channel.endAt === 'number' && channel.endAt < Date.now()) {
          await this.deleteChannel(channel);
          removed += 1;
        }
      });
    }
    this.logger.debug(`Finished sweeping expired notification channels, removed ${removed}.`);
  }

  private isChannel(value: StorageValue): value is NotificationChannel {
    return Boolean((value as NotificationChannel).id);
  }

  private getLockKey(identifier: ResourceIdentifier | string): ResourceIdentifier {
    return { path: `${typeof identifier === 'string' ? identifier : identifier.path}.notification-storage` };
  }

  /**
   * Stops future sweeps and waits for pending storage operations before backend cleanup.
   * `unref()` only allows the process to exit; it does not stop the timer when `App.stop()` is called
   * while other work keeps the process alive.
   */
  public async finalize(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    await this.activeSweep?.catch((): void => {
      // Sweep errors are logged by setSafeInterval and must not prevent backend cleanup.
    });
  }
}
