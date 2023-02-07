import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { NotificationChannel } from './NotificationChannel';

/**
 * Handles the `state` feature of notifications.
 * Every implementation of a specific notification channel type should make sure an instance of this class
 * gets called when a `state` notification can be sent out.
 *
 * Implementations of this class should handle all channels and filter out those that need a `state` notification.
 */
export abstract class StateHandler extends AsyncHandler<{ channel: NotificationChannel }> {}
