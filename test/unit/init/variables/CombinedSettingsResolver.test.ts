import { CombinedSettingsResolver } from '../../../../src/init/variables/CombinedSettingsResolver';
import type { SettingsExtractor } from '../../../../src/init/variables/extractors/SettingsExtractor';

describe('A CombinedSettingsResolver', (): void => {
  const values = { test: 'data' };
  const varPort = 'urn:solid-server:default:variable:port';
  const varLog = 'urn:solid-server:default:variable:loggingLevel';
  let computerPort: jest.Mocked<SettingsExtractor>;
  let computerLog: jest.Mocked<SettingsExtractor>;
  let resolver: CombinedSettingsResolver;

  beforeEach(async(): Promise<void> => {
    computerPort = {
      handleSafe: jest.fn().mockResolvedValue(3000),
    } as any;

    computerLog = {
      handleSafe: jest.fn().mockResolvedValue('info'),
    } as any;

    resolver = new CombinedSettingsResolver({
      [varPort]: computerPort,
      [varLog]: computerLog,
    });
  });

  it('assigns variable values based on the Computers output.', async(): Promise<void> => {
    await expect(resolver.handle(values)).resolves.toEqual({
      [varPort]: 3000,
      [varLog]: 'info',
    });
  });

  it('rethrows the error if something goes wrong.', async(): Promise<void> => {
    computerPort.handleSafe.mockRejectedValueOnce(new Error('bad data'));
    await expect(resolver.handle(values)).rejects.toThrow(`Error in computing value for variable ${varPort}: bad data`);
  });
});
