import { CombinedShorthandResolver } from '../../../../src/init/variables/CombinedShorthandResolver';
import type { ShorthandExtractor } from '../../../../src/init/variables/extractors/ShorthandExtractor';

describe('A CombinedShorthandResolver', (): void => {
  const values = { test: 'data' };
  const varPort = 'urn:solid-server:default:variable:port';
  const varLog = 'urn:solid-server:default:variable:loggingLevel';
  let resolverPort: jest.Mocked<ShorthandExtractor>;
  let resolverLog: jest.Mocked<ShorthandExtractor>;
  let resolver: CombinedShorthandResolver;

  beforeEach(async(): Promise<void> => {
    resolverPort = {
      handleSafe: jest.fn().mockResolvedValue(3000),
    } as any;

    resolverLog = {
      handleSafe: jest.fn().mockResolvedValue('info'),
    } as any;

    resolver = new CombinedShorthandResolver({
      [varPort]: resolverPort,
      [varLog]: resolverLog,
    });
  });

  it('assigns variable values based on the Computers output.', async(): Promise<void> => {
    await expect(resolver.handle(values)).resolves.toEqual({
      [varPort]: 3000,
      [varLog]: 'info',
    });
  });

  it('rethrows the error if something goes wrong.', async(): Promise<void> => {
    resolverPort.handleSafe.mockRejectedValueOnce(new Error('bad data'));
    await expect(resolver.handle(values)).rejects.toThrow(`Error in computing value for variable ${varPort}: bad data`);
  });
});
