import {
  BasicRepresentation,
  ChainedConverter,
  getLoggerFor,
  guardedStreamFrom,
  INTERNAL_QUADS,
  RdfToQuadConverter,
  readableToString,
  RepresentationMetadata,
} from '../../src';
import type { Logger, Representation, RepresentationConverterArgs } from '../../src';
import { BaseTypedRepresentationConverter } from '../../src/storage/conversion/BaseTypedRepresentationConverter';

jest.mock('../../src/logging/LogUtil', (): any => {
  const logger: Logger =
    { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn(), log: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});
const logger: jest.Mocked<Logger> = getLoggerFor('GuardedStream') as any;

class DummyConverter extends BaseTypedRepresentationConverter {
  public constructor() {
    super(INTERNAL_QUADS, 'x/x');
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const data = guardedStreamFrom([ 'dummy' ]);
    const metadata = new RepresentationMetadata(representation.metadata, 'x/x');

    return { binary: true, data, metadata, isEmpty: false };
  }
}

describe('A chained converter where data gets ignored', (): void => {
  const identifier = { path: 'http://test.com/' };
  const rep = new BasicRepresentation('<a:b> <a:b> c!', identifier, 'text/turtle');
  const converter = new ChainedConverter([
    new RdfToQuadConverter(),
    new DummyConverter(),
  ]);

  it('does not throw on async crash.', async(): Promise<void> => {
    jest.useFakeTimers();
    const result = await converter.handleSafe({ identifier, representation: rep, preferences: { type: { 'x/x': 1 }}});

    await expect(readableToString(result.data)).resolves.toBe('dummy');

    jest.advanceTimersByTime(1000);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
