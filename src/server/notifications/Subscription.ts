import { parse, toSeconds } from 'iso8601-duration';
import type { InferType } from 'yup';
import { array, number, object, string } from 'yup';
import { CONTEXT_NOTIFICATION } from './Notification';

/**
 * A JSON parsing schema that can be used to parse subscription input.
 * Specific subscription types can extend this schema with their own custom keys.
 */
export const SUBSCRIBE_SCHEMA = object({
  '@context': array(string()).ensure().required().test({
    name: 'RequireNotificationContext',
    message: `The ${CONTEXT_NOTIFICATION} context is required in the subscription JSON-LD body.`,
    test: (context): boolean => Boolean(context?.includes(CONTEXT_NOTIFICATION)),
  }),
  type: string().required(),
  topic: string().required(),
  state: string().optional(),
  expiration: number().transform((value, original): number | undefined =>
    // Convert the date string to milliseconds
    Date.parse(original)).optional(),
  rate: number().transform((value, original): number | undefined =>
    // Convert the rate string to milliseconds
    toSeconds(parse(original)) * 1000).optional(),
  accept: string().optional(),
});
export type Subscription = InferType<typeof SUBSCRIBE_SCHEMA>;
