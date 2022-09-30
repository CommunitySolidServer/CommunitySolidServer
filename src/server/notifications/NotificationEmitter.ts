import type { Representation } from '../../http/representation/Representation';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { SubscriptionInfo } from './SubscriptionStorage';

export interface NotificationEmitterInput {
  representation: Representation;
  info: SubscriptionInfo;
}

/**
 * Emits a serialized Notification to the subscription defined by the info.
 */
export abstract class NotificationEmitter extends AsyncHandler<NotificationEmitterInput> {}
