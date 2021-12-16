import type { WellKnownBuilder } from '../http/well-known/WellKnownBuilder';
import { joinUrl, trimTrailingSlashes } from '../util/PathUtil';

export interface NotificationWellKnownBuilderArgs {
  baseUrl: string;
  notificationEndpointPath: string;
}

export class NotificationWellKnownBuilder implements WellKnownBuilder {
  private readonly notificationEndpoint: string;

  public constructor(args: NotificationWellKnownBuilderArgs) {
    this.notificationEndpoint = trimTrailingSlashes(joinUrl(args.baseUrl, args.notificationEndpointPath));
  }

  public async getWellKnownSegment(): Promise<Record<string, any>> {
    return {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      // eslint-disable-next-line @typescript-eslint/naming-convention
      notification_endpoint: this.notificationEndpoint,
    };
  }
}
