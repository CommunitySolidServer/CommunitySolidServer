import type { InferType } from 'yup';
import type { AccessMap } from '../../authorization/permissions/Permissions';
import type { Representation } from '../../http/representation/Representation';
import type { SUBSCRIBE_SCHEMA } from './Subscription';
import type { SubscriptionInfo } from './SubscriptionStorage';

export interface SubscriptionResponse<TFeat extends Record<string, unknown> = Record<string, unknown>> {
  response: Representation;
  info: SubscriptionInfo<TFeat>;
}

/**
 * A specific subscription type as defined at https://solidproject.org/TR/notifications-protocol#subscription-types.
 */
export interface SubscriptionType<TSub extends typeof SUBSCRIBE_SCHEMA = typeof SUBSCRIBE_SCHEMA,
  TFeat extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * The expected type value in the JSON-LD body of requests subscribing for this subscription type.
   */
  readonly type: string;
  /**
   * An extension of {@link SUBSCRIBE_SCHEMA} that can be used to parse and valide an incoming subscription request.
   */
  readonly schema: TSub;
  /**
   * Determines which modes are required to allow the given subscription.
   * @param subscription - The subscription to verify.
   *
   * @returns The required modes.
   */
  extractModes: (subscription: InferType<TSub>) => Promise<AccessMap>;
  /**
   * Registers the given subscription.
   * @param subscription - The subscription to register.
   *
   * @returns A {@link Representation} to return as a response and the generated {@link SubscriptionInfo}.
   */
  subscribe: (subscription: InferType<TSub>) => Promise<SubscriptionResponse<TFeat>>;
}
