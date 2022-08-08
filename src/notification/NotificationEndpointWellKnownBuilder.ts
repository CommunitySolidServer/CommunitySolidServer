import type { WellKnownBuilder, WellKnownSegment } from '../http/well-known/WellKnownBuilder';
import { joinUrl, trimTrailingSlashes } from '../util/PathUtil';

export class NotificationEndpointWellKnownBuilder implements WellKnownBuilder {
  private readonly notificationEndpoint: string;

  public constructor(
    baseUrl: string,
    notificationEndpointPath: string,
  ) {
    this.notificationEndpoint = trimTrailingSlashes(joinUrl(baseUrl, notificationEndpointPath));
  }

  public async getWellKnownSegment(): Promise<WellKnownSegment> {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      notification_endpoint: this.notificationEndpoint,
    };
  }
}
