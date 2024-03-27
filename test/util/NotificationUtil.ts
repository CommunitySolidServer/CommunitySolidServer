import { fetch } from 'cross-fetch';

/**
 * Subscribes to a notification channel.
 *
 * @param type - The type of the notification channel, e.g., "NOTIFY.WebhookChannel2023".
 * @param webId - The WebID to spoof in the authorization header. This assumes the config uses the debug auth import.
 * @param subscriptionUrl - The subscription URL to which the request needs to be sent.
 * @param topic - The topic to subscribe to.
 * @param features - Any extra fields that need to be added to the subscription body.
 */
export async function subscribe(
  type: string,
  webId: string,
  subscriptionUrl: string,
  topic: string,
  features: Record<string, unknown> = {},
): Promise<unknown> {
  const channel = {
    '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
    type,
    topic,
    ...features,
  };

  const response = await fetch(subscriptionUrl, {
    method: 'POST',
    headers: { authorization: `WebID ${webId}`, 'content-type': 'application/ld+json' },
    body: JSON.stringify(channel),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/ld+json');
  const jsonResponse = await response.json();
  expect(jsonResponse.type).toBe(type);
  return jsonResponse;
}

/**
 * Verifies if a notification has the expected format.
 *
 * @param notification - The (parsed) notification.
 * @param topic - The topic of the notification.
 * @param type - What type of notification is expected.
 */
export function expectNotification(notification: unknown, topic: string, type: string): void {
  const expected: any = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://www.w3.org/ns/solid/notification/v1',
    ],
    id: expect.stringContaining(topic),
    type,
    object: topic,
    published: expect.anything(),
  };
  if (type !== 'Delete') {
    expected.state = expect.anything();
  }
  expect(notification).toEqual(expected);
}
