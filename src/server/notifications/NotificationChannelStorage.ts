import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { NotificationChannel } from './NotificationChannel';

/**
 * Stores all the information necessary to keep track of notification channels.
 * Besides the standard channel info it also stores features specific to a certain channel type.
 *
 * This storage assumes that a channel can only have a single identifier as its topic.
 */
export interface NotificationChannelStorage {
  /**
   * Returns the requested channel.
   * `undefined` if no match was found or if the notification channel expired.
   *
   * @param id - The identifier of the notification channel.
   */
  get: (id: string) => Promise<NotificationChannel | undefined>;

  /**
   * Returns the identifiers of all notification channel entries that have the given identifier as their topic.
   * The identifiers can potentially correspond to expired channels.
   *
   * @param topic - The identifier that is the topic.
   */
  getAll: (topic: ResourceIdentifier) => Promise<string[]>;

  /**
   * Adds the given channel to the storage.
   *
   * @param channel - Channel to add.
   */
  add: (channel: NotificationChannel) => Promise<void>;

  /**
   * Updates the given notification channel.
   * The `id` and the `topic` can not be updated.
   *
   * @param channel - The channel to update.
   */
  update: (channel: NotificationChannel) => Promise<void>;

  /**
   * Deletes the given notification channel from the storage.
   * Returns true if the channel existed.
   *
   * @param id - The identifier of the notification channel
   */
  delete: (id: string) => Promise<boolean>;
}
