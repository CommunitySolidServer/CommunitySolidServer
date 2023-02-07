import type { Representation } from '../../http/representation/Representation';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { NotificationChannel } from './NotificationChannel';

export interface NotificationEmitterInput {
  representation: Representation;
  channel: NotificationChannel;
}

/**
 * Emits a serialized Notification to the channel.
 */
export abstract class NotificationEmitter extends AsyncHandler<NotificationEmitterInput> {}
