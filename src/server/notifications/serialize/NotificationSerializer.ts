import type { Representation } from '../../../http/representation/Representation';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { Notification } from '../Notification';
import type { SubscriptionInfo } from '../SubscriptionStorage';

export interface NotificationSerializerInput {
  notification: Notification;
  info: SubscriptionInfo;
}

/**
 * Converts a {@link Notification} into a {@link Representation} that can be transmitted.
 *
 * The reason this is a separate class in between a generator and emitter,
 * is so a specific subscription type can add extra metadata to the Representation if needed.
 */
export abstract class NotificationSerializer extends AsyncHandler<NotificationSerializerInput, Representation> { }
