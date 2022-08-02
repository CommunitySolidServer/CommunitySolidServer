import type { CliExtractor } from '../../../src/init/cli/CliExtractor';
import { CliResolver } from '../../../src/init/CliResolver';
import type { ShorthandResolver } from '../../../src/init/variables/ShorthandResolver';

describe('A CliResolver', (): void => {
  it('stores a CliExtractor and SettingsResolver.', async(): Promise<void> => {
    const cliExtractor: CliExtractor = { canHandle: jest.fn().mockResolvedValue('CLI!') } as any;
    const settingsResolver: ShorthandResolver = { canHandle: jest.fn().mockResolvedValue('Settings!') } as any;
    const cliResolver = new CliResolver(cliExtractor, settingsResolver);
    expect(cliResolver.cliExtractor).toBe(cliExtractor);
    expect(cliResolver.shorthandResolver).toBe(settingsResolver);
  });
});
