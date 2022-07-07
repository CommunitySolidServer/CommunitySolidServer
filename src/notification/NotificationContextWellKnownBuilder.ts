import type { WellKnownBuilder } from '../http/well-known/WellKnownBuilder';

/**
 * This {@link WellKnownBuilder} adds the appropriate @context values to the subscription metadata.
 */
export class NotificationContextWellKnownBuilder implements WellKnownBuilder {
  public async getWellKnownSegment(): Promise<Record<string, any>> {
    return {
      '@context': [
        'https://www.w3.org/ns/solid/notification/v1',
      ],
    };
  }
}
