import type { WellKnownBuilder } from './WellKnownBuilder';

export class AggregateWellKnownBuilder implements WellKnownBuilder {
  public constructor(private readonly wellKnownBuilders: WellKnownBuilder[]) {}

  public async getWellKnownSegment(): Promise<Record<string, any>> {
    let wellKnown: Record<string, any> = {};
    await Promise.all(this.wellKnownBuilders.map(async(builder): Promise<void> => {
      wellKnown = { ...wellKnown, ...await builder.getWellKnownSegment() };
    }));
    return wellKnown;
  }
}
