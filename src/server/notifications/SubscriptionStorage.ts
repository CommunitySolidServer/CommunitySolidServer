import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Subscription } from './Subscription';

/**
 * The info provided during a subscription.
 * `features` can contain custom values relevant for a specific subscription type.
 */
export type SubscriptionInfo<T = Record<string, unknown>> = {
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
 * Stores all the information necessary to keep track of notification subscriptions.
 * Besides the standard subscription info it also stores features specific to a certain subscription type.
 *
 * This storage assumes that a subscription can only have a single identifier as its topic.
 */
export interface SubscriptionStorage<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Creates info corresponding to the given subscription and features.
   * This does not store the generated info in the storage.
   * @param subscription - Subscription to generate info of.
   * @param features - Features to add to the info
   */
  create: (subscription: Subscription, features: T) => SubscriptionInfo<T>;

  /**
   * Returns the info for the requested subscription.
   * `undefined` if no match was found or if the subscription expired.
   * @param id - The identifier of the subscription.
   */
  get: (id: string) => Promise<SubscriptionInfo<T> | undefined>;

  /**
   * Returns the identifiers of all subscription entries that have the given identifier as their topic.
   * @param topic - The identifier that is the topic.
   */
  getAll: (topic: ResourceIdentifier) => Promise<string[]>;

  /**
   * Adds the given info to the storage.
   * @param info - Info to add.
   */
  add: (info: SubscriptionInfo<T>) => Promise<void>;

  /**
   * Updates the given subscription info.
   * The `id` and the `topic` can not be updated.
   * @param info - The info to update.
   */
  update: (info: SubscriptionInfo<T>) => Promise<void>;

  /**
   * Deletes the given subscription from the storage.
   * @param id - The identifier of the subscription
   */
  delete: (id: string) => Promise<void>;
}
