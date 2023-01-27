/**
 * Internal representation of a notification channel.
 * Most of the fields are those defined in
 * https://solidproject.org/TR/2022/notifications-protocol-20221231#notification-channel-data-model
 *
 * We only support notification channels with a single topic.
 */
export interface NotificationChannel {
  /**
   * The unique identifier of the channel.
   */
  id: string;
  /**
   * The channel type.
   */
  type: string;
  /**
   * The resource this channel sends notifications about.
   */
  topic: string;
  /**
   * The state parameter sent by the receiver.
   * This is used to send a notification when the channel is established and the topic resource has a different state.
   */
  state?: string;
  /**
   * When the channel should start sending notifications, in milliseconds since epoch.
   */
  startAt?: number;
  /**
   * When the channel should stop existing, in milliseconds since epoch.
   */
  endAt?: number;
  /**
   * The minimal time required between notifications, in milliseconds.
   */
  rate?: number;
  /**
   * The media type in which the receiver expects the notifications.
   */
  accept?: string;
  /**
   * The resource receivers can use to establish a connection and receive notifications.
   */
  receiveFrom?: string;
  /**
   * The resource on the receiver where notifications can be sent.
   */
  sendTo?: string;
  /**
   * Can be used to identify the sender.
   */
  sender?: string;

  /**
   * Internal value that we use to track when this channel last sent a notification.
   */
  lastEmit?: number;
}
