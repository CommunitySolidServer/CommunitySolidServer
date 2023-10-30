import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { Notification } from '../Notification';
import type { NotificationHandlerInput } from '../NotificationHandler';

/**
 * Creates a {@link Notification} based on the provided input.
 */
export abstract class NotificationGenerator extends AsyncHandler<NotificationHandlerInput, Notification> {}
