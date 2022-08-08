import type { WellKnownBuilder, WellKnownSegment } from '../http/well-known/WellKnownBuilder';
import { SOLID_NOTIFICATION } from '../util/Vocabularies';

export class NotificationContextWellKnownBuilder implements WellKnownBuilder {
  public async getWellKnownSegment(): Promise<WellKnownSegment> {
    return {
      '@context': [
        SOLID_NOTIFICATION.namespace,
      ],
    };
  }
}
