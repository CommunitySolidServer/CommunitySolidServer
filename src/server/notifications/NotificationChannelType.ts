import type { InferType } from 'yup';
import type { Credentials } from '../../authentication/Credentials';
import type { AccessMap } from '../../authorization/permissions/Permissions';
import type { Representation } from '../../http/representation/Representation';
import type { NOTIFICATION_CHANNEL_SCHEMA } from './NotificationChannel';
import type { NotificationChannelInfo } from './NotificationChannelStorage';

export interface NotificationChannelResponse<TFeat extends Record<string, unknown> = Record<string, unknown>> {
  response: Representation;
  info: NotificationChannelInfo<TFeat>;
}

/**
 * A specific channel type as defined at
 * https://solidproject.org/TR/2022/notifications-protocol-20221231#notification-channel-types.
 */
export interface NotificationChannelType<
  TSub extends typeof NOTIFICATION_CHANNEL_SCHEMA = typeof NOTIFICATION_CHANNEL_SCHEMA,
  TFeat extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * The expected type value in the JSON-LD body of requests subscribing for this notification channel type.
   */
  readonly type: string;
  /**
   * An extension of {@link NOTIFICATION_CHANNEL_SCHEMA}
   * that can be used to parse and validate an incoming subscription request with a notification channel body.
   */
  readonly schema: TSub;
  /**
   * Determines which modes are required to allow the given notification channel.
   * @param channel - The notification channel to verify.
   *
   * @returns The required modes.
   */
  extractModes: (channel: InferType<TSub>) => Promise<AccessMap>;
  /**
   * Registers the given notification channel.
   * @param channel - The notification channel to register.
   * @param credentials - The credentials of the client trying to subscribe.
   *
   * @returns A {@link Representation} to return as a response and the generated {@link NotificationChannelInfo}.
   */
  subscribe: (channel: InferType<TSub>, credentials: Credentials) => Promise<NotificationChannelResponse<TFeat>>;
}
