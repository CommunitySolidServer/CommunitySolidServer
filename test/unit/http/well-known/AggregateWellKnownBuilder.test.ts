import { AggregateWellKnownBuilder } from '../../../../src/http/well-known/AggregateWellKnownBuilder';
import type { WellKnownBuilder } from '../../../../src/http/well-known/WellKnownBuilder';

describe('An AggregateWellKnownBuilder', (): void => {
  it('returns empty record if no builders are provided.', async(): Promise<void> => {
    const aggregateWellKnownBuilder = new AggregateWellKnownBuilder([]);
    const result = aggregateWellKnownBuilder.getWellKnownSegment();
    await expect(result).resolves.toStrictEqual({});
  });

  it('returns the aggregated segments by using the provided builders.', async(): Promise<void> => {
    const mockedWellKnownBuilders: WellKnownBuilder[] = [
      { getWellKnownSegment: jest.fn().mockResolvedValue({ builder1: 'segment1' }) },
      { getWellKnownSegment: jest.fn().mockResolvedValue({ builder2: 'segment2' }) },
    ];
    const aggregateWellKnownBuilder = new AggregateWellKnownBuilder(mockedWellKnownBuilders);
    const result = aggregateWellKnownBuilder.getWellKnownSegment();
    await expect(result).resolves.toMatchObject({ builder1: 'segment1', builder2: 'segment2' });
  });
});
