export const CONTEXT_ACTIVITYSTREAMS = 'https://www.w3.org/ns/activitystreams';
export const CONTEXT_NOTIFICATION = 'https://www.w3.org/ns/solid/notification/v1';

/**
 * The minimal expected fields for a Notification
 * as defined in https://solidproject.org/TR/notifications-protocol#notification-data-model.
 */
export interface Notification {
  '@context': [
    typeof CONTEXT_ACTIVITYSTREAMS,
    typeof CONTEXT_NOTIFICATION,
    ...string[],
  ];
  id: string;
  type: string[];
  object: {
    id: string;
    type: string[];
  };
  state?: string;
  published: string;
}
