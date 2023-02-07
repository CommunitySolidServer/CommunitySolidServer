import type { Representation } from '../../http/representation/Representation';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { NotificationChannel } from './NotificationChannel';

export interface NotificationEmitterInput<T = Record<string, unknown>> {
  representation: Representation;
  channel: NotificationChannel<T>;
}

/**
 * Emits a serialized Notification to the channel defined by the channel.
 */
export abstract class NotificationEmitter<T = Record<string, unknown>>
  extends AsyncHandler<NotificationEmitterInput<T>> {}
