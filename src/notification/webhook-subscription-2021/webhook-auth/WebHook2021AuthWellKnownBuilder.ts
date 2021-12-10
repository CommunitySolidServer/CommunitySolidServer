import type { WellKnownBuilder } from '../../../http/well-known/WellKnownBuilder';
import { joinUrl, trimTrailingSlashes } from '../../../util/PathUtil';

interface WebHook2021AuthWellKnownBuilderArgs {
  baseUrl: string;
  jwksEndpointPath: string;
}

export class WebHook2021AuthWellKnownBuilder implements WellKnownBuilder {
  private readonly jwksEndpoint: string;

  public constructor(args: WebHook2021AuthWellKnownBuilderArgs) {
    this.jwksEndpoint = trimTrailingSlashes(joinUrl(args.baseUrl, args.jwksEndpointPath));
  }

  public async getWellKnownSegment(): Promise<Record<string, any>> {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      jwks_endpoint: this.jwksEndpoint,
    };
  }
}
