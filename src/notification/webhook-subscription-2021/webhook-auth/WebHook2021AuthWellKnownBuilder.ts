import type { WellKnownBuilder } from '../../../http/well-known/WellKnownBuilder';

export class WebHook2021AuthWellKnownBuilder implements WellKnownBuilder {
  public async getWellKnownSegment(): Promise<Record<string, any>> {
    return {
      example: 'blah',
    };
  }
}
