import type { WellKnownBuilder } from './WellKnownBuilder';

export class AggregateWellKnownBuilder implements WellKnownBuilder {
  public constructor(private readonly wellKnownBuilders: WellKnownBuilder[]) {}

  public async getWellKnownSegment(): Promise<Record<string, any>> {
    const wellKnowns: Record<string, any>[] = [];
    await Promise.all(this.wellKnownBuilders.map(async(builder): Promise<void> => {
      wellKnowns.push(await builder.getWellKnownSegment());
    }));
    const wellKnown = wellKnowns.reduce((aggWellKnown, newWellKnown): Record<string, any> => ({
      ...aggWellKnown,
      ...newWellKnown,
    }), {});
    return wellKnown;
  }
}
