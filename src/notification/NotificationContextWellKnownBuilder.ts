import type { WellKnownBuilder } from '../http/well-known/WellKnownBuilder';

export class NotificationContextWellKnownBuilder implements WellKnownBuilder {
  public async getWellKnownSegment(): Promise<Record<string, any>> {
    return {
      '@context': [
        'https://www.w3.org/ns/solid/notification/v1',
      ],
    };
  }
}
