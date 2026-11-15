import { Finalizer } from '../../init/final/Finalizer';
import { getLoggerFor } from '../../logging/LogUtil';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { setSafeInterval } from '../../util/TimerUtil';
import type { NotificationChannel } from './NotificationChannel';
import type { NotificationChannelStorage } from './NotificationChannelStorage';

/**
 * Periodically removes expired channels from the storage of a {@link KeyValueChannelStorage}.
 * That class only removes expired channels when they are requested,
 * so channels that are never requested again would otherwise remain in the storage forever.
 *
 * Expired channels are found by going through all entries of the key/value storage.
 * These are then requested from the channel storage, which causes it to remove them.
 *
 * When finalized, no new sweeps are started and the active sweep is awaited.
 */
export class KeyValueChannelSweeper extends Finalizer {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: KeyValueStorage<string, unknown>;
  private readonly channelStorage: NotificationChannelStorage;
  private readonly timer?: NodeJS.Timeout;
  private activeSweep?: Promise<void>;

  /**
   * @param storage - The key/value storage used by the channel storage.
   * @param channelStorage - The channel storage that removes expired channels when they are requested.
   * @param sweepInterval - How often expired channels should be removed, in minutes. `0` disables the sweep.
   * @param jitter - Maximum random fraction of `sweepInterval` that is added to the interval,
   *                 so multiple instances do not all sweep at the same time.
   */
  public constructor(
    storage: KeyValueStorage<string, unknown>,
    channelStorage: NotificationChannelStorage,
    sweepInterval = 60,
    jitter = 0.15,
  ) {
    super();
    this.storage = storage;
    this.channelStorage = channelStorage;

    if (sweepInterval > 0) {
      const period = sweepInterval * 60 * 1000;
      // Negative and NaN values would shorten the interval
      const jitterMs = Math.floor(Math.random() * period * (jitter > 0 ? jitter : 0));
      this.timer = setSafeInterval(
        this.logger,
        'Failed to remove expired notification channels',
        this.sweep.bind(this),
        period + jitterMs,
      );
      this.timer.unref();
    }
  }

  public async handle(): Promise<void> {
    clearInterval(this.timer);
    await this.activeSweep?.catch((): void => {
      // Errors are already logged by the interval callback
    });
  }

  /**
   * Prevents a new sweep from starting while the previous one is still running.
   */
  private async sweep(): Promise<void> {
    if (!this.activeSweep) {
      this.activeSweep = this.removeExpiredChannels().finally((): void => {
        this.activeSweep = undefined;
      });
    }
    return this.activeSweep;
  }

  private async removeExpiredChannels(): Promise<void> {
    this.logger.debug('Removing expired notification channels');
    const expired: string[] = [];
    // Not deleting while iterating to prevent iterator issues
    for await (const [ , value ] of this.storage.entries()) {
      const channel = value as Partial<NotificationChannel>;
      if (typeof channel.id === 'string' && typeof channel.endAt === 'number' && channel.endAt < Date.now()) {
        expired.push(channel.id);
      }
    }
    for (const id of expired) {
      await this.channelStorage.get(id);
    }
    this.logger.debug(`Finished removing ${expired.length} expired notification channels`);
  }
}
