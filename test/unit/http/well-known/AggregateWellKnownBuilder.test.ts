import { AggregateWellKnownBuilder } from '../../../../src/http/well-known/AggregateWellKnownBuilder';
import type { WellKnownBuilder } from '../../../../src/http/well-known/WellKnownBuilder';

describe('An AggregateWellKnownBuilder', (): void => {
  it('returns empty record if no builders are provided.', async(): Promise<void> => {
    const wellKnownBuilders: WellKnownBuilder[] = [];
    const aggregateWellKnownBuilder = new AggregateWellKnownBuilder(wellKnownBuilders);
    const promise = aggregateWellKnownBuilder.getWellKnownSegment();
    await expect(promise).resolves.toStrictEqual({});
  });
  it('returns the aggregated segments by using the provided builders.', async(): Promise<void> => {
    const builder1: WellKnownBuilder = {
      getWellKnownSegment: jest.fn((): Promise<Record<string, any>> => Promise.resolve({ builder1: 'segment1' })),
    };
    const builder2: WellKnownBuilder = {
      getWellKnownSegment: jest.fn((): Promise<Record<string, any>> => Promise.resolve({ builder2: 'segment2' })),
    };
    const wellKnownBuilders: WellKnownBuilder[] = [ builder1, builder2 ];
    const aggregateWellKnownBuilder = new AggregateWellKnownBuilder(wellKnownBuilders);
    const promise = aggregateWellKnownBuilder.getWellKnownSegment();
    await expect(promise).resolves.toStrictEqual({ builder1: 'segment1', builder2: 'segment2' });
  });
});
