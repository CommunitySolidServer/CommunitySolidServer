import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { SubscriptionInfo } from './SubscriptionStorage';

/**
 * Handles the `state` feature of notifications.
 * Every implementation of a specific subscription type should make sure an instance of this class
 * gets called when a `state` notification can be sent out.
 *
 * Implementations of this class should handle all subscriptions and filter out those that need a `state` notification.
 */
export abstract class StateHandler extends AsyncHandler<{ info: SubscriptionInfo }> {}
