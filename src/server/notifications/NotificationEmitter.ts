import type { Representation } from '../../http/representation/Representation';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { SubscriptionInfo } from './SubscriptionStorage';

export interface NotificationEmitterInput<T = Record<string, unknown>> {
  representation: Representation;
  info: SubscriptionInfo<T>;
}

/**
 * Emits a serialized Notification to the subscription defined by the info.
 */
export abstract class NotificationEmitter<T = Record<string, unknown>>
  extends AsyncHandler<NotificationEmitterInput<T>> {}
