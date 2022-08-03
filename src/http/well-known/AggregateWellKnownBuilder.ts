import type { WellKnownBuilder } from './WellKnownBuilder';

export class AggregateWellKnownBuilder implements WellKnownBuilder {
  public constructor(
    private readonly wellKnownBuilders: WellKnownBuilder[],
  ) {}

  public async getWellKnownSegment(): Promise<Record<string, any>> {
    // Retrieve segment from every builder
    const segments = await Promise.all(this.wellKnownBuilders.map(
      async(builder): Promise<Record<string, any>> => builder.getWellKnownSegment(),
    ));
    // Combine and return all segments
    return segments.reduce((acc, segment): Record<string, any> => ({ ...acc, ...segment }), {});
  }
}
