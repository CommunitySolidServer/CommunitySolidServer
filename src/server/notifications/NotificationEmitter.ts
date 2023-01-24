import type { Representation } from '../../http/representation/Representation';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { NotificationChannelInfo } from './NotificationChannelStorage';

export interface NotificationEmitterInput<T = Record<string, unknown>> {
  representation: Representation;
  info: NotificationChannelInfo<T>;
}

/**
 * Emits a serialized Notification to the channel defined by the info.
 */
export abstract class NotificationEmitter<T = Record<string, unknown>>
  extends AsyncHandler<NotificationEmitterInput<T>> {}
