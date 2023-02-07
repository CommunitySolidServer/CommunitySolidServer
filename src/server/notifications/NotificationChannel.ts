import { parse, toSeconds } from 'iso8601-duration';
import type { InferType } from 'yup';
import { array, number, object, string } from 'yup';
import { CONTEXT_NOTIFICATION } from './Notification';

/**
 * A JSON parsing schema that can be used to parse a notification channel sent during subscription.
 * Specific notification channels can extend this schema with their own custom keys.
 */
export const NOTIFICATION_CHANNEL_SCHEMA = object({
  '@context': array(string()).ensure().required().test({
    name: 'RequireNotificationContext',
    message: `The ${CONTEXT_NOTIFICATION} context is required in the notification channel JSON-LD body.`,
    test: (context): boolean => Boolean(context?.includes(CONTEXT_NOTIFICATION)),
  }),
  type: string().required(),
  topic: string().required(),
  state: string().optional(),
  startAt: number().transform((value, original): number | undefined =>
    // Convert the date string to milliseconds
    Date.parse(original)).optional(),
  endAt: number().transform((value, original): number | undefined =>
    // Convert the date string to milliseconds
    Date.parse(original)).optional(),
  rate: number().transform((value, original): number | undefined =>
    // Convert the rate string to milliseconds
    toSeconds(parse(original)) * 1000).optional(),
  accept: string().optional(),
});
export type NotificationChannelJson = InferType<typeof NOTIFICATION_CHANNEL_SCHEMA>;

/**
 * The info provided for a notification channel during a subscription.
 * `features` can contain custom values relevant for a specific channel type.
 */
export type NotificationChannel<T = Record<string, unknown>> = {
  id: string;
  topic: string;
  type: string;
  startAt?: number;
  endAt?: number;
  accept?: string;
  rate?: number;
  state?: string;
  lastEmit: number;
  features: T;
};
