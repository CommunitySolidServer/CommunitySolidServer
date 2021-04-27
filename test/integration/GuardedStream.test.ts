import {
  RepresentationMetadata,
  TypedRepresentationConverter,
  readableToString,
  ChainedConverter,
  guardedStreamFrom,
  RdfToQuadConverter,
  BasicRepresentation,
  getLoggerFor,
  INTERNAL_QUADS,
} from '../../src';
import type { Representation,
  RepresentationConverterArgs,
  Logger } from '../../src';

jest.mock('../../src/logging/LogUtil', (): any => {
  const logger: Logger = { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});
const logger: jest.Mocked<Logger> = getLoggerFor('GuardedStream') as any;

class DummyConverter extends TypedRepresentationConverter {
  public constructor() {
    super('*/*', 'custom/type');
  }

  public async getInputTypes(): Promise<Record<string, number>> {
    return { [INTERNAL_QUADS]: 1 };
  }

  public async getOutputTypes(): Promise<Record<string, number>> {
    return { 'x/x': 1 };
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const data = guardedStreamFrom([ 'dummy' ]);
    const metadata = new RepresentationMetadata(representation.metadata, 'x/x');

    return { binary: true, data, metadata };
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

    expect(await readableToString(result.data)).toBe('dummy');

    jest.advanceTimersByTime(1000);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
