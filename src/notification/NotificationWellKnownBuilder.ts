import type { WellKnownBuilder } from '../http/well-known/WellKnownBuilder';

export class NotificationWellKnownBuilder implements WellKnownBuilder {
  public async getWellKnownSegment(): Promise<Record<string, any>> {
    return {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      // eslint-disable-next-line @typescript-eslint/naming-convention
      notification_endpoint: 'https://gateway.example',
    };
  }
}
