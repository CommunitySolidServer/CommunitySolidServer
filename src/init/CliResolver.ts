import type { CliExtractor } from './cli/CliExtractor';
import type { SettingsResolver } from './variables/SettingsResolver';

/**
 * A class that combines a {@link CliExtractor} and a {@link SettingsResolver}.
 * Mainly exists so both such classes can be generated in a single Components.js instance.
 */
export class CliResolver {
  public readonly cliExtractor: CliExtractor;
  public readonly settingsResolver: SettingsResolver;

  public constructor(cliExtractor: CliExtractor, settingsResolver: SettingsResolver) {
    this.cliExtractor = cliExtractor;
    this.settingsResolver = settingsResolver;
  }
}
