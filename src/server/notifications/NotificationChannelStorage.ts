import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { NotificationChannel } from './NotificationChannel';

/**
 * The info provided for a notification channel during a subscription.
 * `features` can contain custom values relevant for a specific channel type.
 */
export type NotificationChannelInfo<T = Record<string, unknown>> = {
  id: string;
  topic: string;
  type: string;
  startAt?: number;
  endAt?: number;
  accept?: string;
  rate?: number;
  state?: string;
  lastEmit: number;
  features: T;
};

/**
 * Stores all the information necessary to keep track of notification channels.
 * Besides the standard channel info it also stores features specific to a certain channel type.
 *
 * This storage assumes that a channel can only have a single identifier as its topic.
 */
export interface NotificationChannelStorage<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Creates info corresponding to the given channel and features.
   * This does not store the generated info in the storage.
   * @param channel - Notification channel to generate info of.
   * @param features - Features to add to the info
   */
  create: (channel: NotificationChannel, features: T) => NotificationChannelInfo<T>;

  /**
   * Returns the info for the requested notification channel.
   * `undefined` if no match was found or if the notification channel expired.
   * @param id - The identifier of the notification channel.
   */
  get: (id: string) => Promise<NotificationChannelInfo<T> | undefined>;

  /**
   * Returns the identifiers of all notification channel entries that have the given identifier as their topic.
   * The identifiers can potentially correspond to expired channels.
   * @param topic - The identifier that is the topic.
   */
  getAll: (topic: ResourceIdentifier) => Promise<string[]>;

  /**
   * Adds the given info to the storage.
   * @param info - Info to add.
   */
  add: (info: NotificationChannelInfo<T>) => Promise<void>;

  /**
   * Updates the given notification channel info.
   * The `id` and the `topic` can not be updated.
   * @param info - The info to update.
   */
  update: (info: NotificationChannelInfo<T>) => Promise<void>;

  /**
   * Deletes the given notification channel from the storage.
   * @param id - The identifier of the notification channel
   */
  delete: (id: string) => Promise<void>;
}
