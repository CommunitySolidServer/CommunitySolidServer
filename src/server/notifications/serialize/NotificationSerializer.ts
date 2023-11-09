import type { Representation } from '../../../http/representation/Representation';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { Notification } from '../Notification';
import type { NotificationChannel } from '../NotificationChannel';

export interface NotificationSerializerInput {
  notification: Notification;
  channel: NotificationChannel;
}

/**
 * Converts a {@link Notification} into a {@link Representation} that can be transmitted.
 *
 * This is a separate class between a generator and emitter,
 * so that a specific notification channel type can add extra metadata to the Representation if needed.
 */
export abstract class NotificationSerializer extends AsyncHandler<NotificationSerializerInput, Representation> {}
