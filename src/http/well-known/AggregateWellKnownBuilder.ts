import type { WellKnownBuilder, WellKnownSegment } from './WellKnownBuilder';

export class AggregateWellKnownBuilder implements WellKnownBuilder {
  public constructor(
    private readonly wellKnownBuilders: WellKnownBuilder[],
  ) {}

  public async getWellKnownSegment(): Promise<WellKnownSegment> {
    // Retrieve segment from every builder
    const segments = await Promise.all(this.wellKnownBuilders.map(
      async(builder): Promise<WellKnownSegment> => builder.getWellKnownSegment(),
    ));
    // Combine and return all segments
    return segments.reduce((acc, segment): WellKnownSegment => ({ ...acc, ...segment }), {});
  }
}
