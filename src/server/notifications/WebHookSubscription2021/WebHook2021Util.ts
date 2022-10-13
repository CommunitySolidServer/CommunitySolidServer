import { joinUrl } from '../../../util/PathUtil';

/**
 * Generates a specific unsubscribe URL for a WebHookSubscription2021
 * by combining the default unsubscribe URL with the given identifier.
 * @param url - The default unsubscribe URL.
 * @param id - The identifier.
 */
export function generateWebHookUnsubscribeUrl(url: string, id: string): string {
  return joinUrl(url, encodeURIComponent(id));
}

/**
 * Parses a WebHookSubscription2021 unsubscribe URL to extract the identifier.
 * @param url - The unsubscribe URL that is being called.
 */
export function parseWebHookUnsubscribeUrl(url: string): string {
  // Split always returns an array of at least length 1 so result can not be undefined
  return decodeURIComponent(url.split(/\//u).pop()!);
}
