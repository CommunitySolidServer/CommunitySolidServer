export const CONTEXT_ACTIVITYSTREAMS = 'https://www.w3.org/ns/activitystreams';
export const CONTEXT_NOTIFICATION = 'https://www.w3.org/ns/solid/notification/v1';

/**
 * The minimally expected fields for a Notification
 * as defined in https://solidproject.org/TR/2022/notifications-protocol-20221231#data-model.
 */
export interface Notification {
  // eslint-disable-next-line ts/naming-convention
  '@context': [
    typeof CONTEXT_ACTIVITYSTREAMS,
    typeof CONTEXT_NOTIFICATION,
    ...string[],
  ];
  id: string;
  type: string;
  object: string;
  state?: string;
  target?: string | string[];
  published: string;
}
