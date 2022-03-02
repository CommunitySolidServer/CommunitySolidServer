import type { Settings } from '../Types';
import { SettingsExtractor } from './SettingsExtractor';

/**
 * A simple {@link SettingsExtractor} that extracts a single value from the input map.
 * Returns the default value if it was defined in case no value was found in the map.
 */
export class KeyExtractor extends SettingsExtractor {
  private readonly key: string;
  private readonly defaultValue: unknown;

  public constructor(key: string, defaultValue?: unknown) {
    super();
    this.key = key;
    this.defaultValue = defaultValue;
  }

  public async handle(args: Settings): Promise<unknown> {
    return typeof args[this.key] === 'undefined' ? this.defaultValue : args[this.key];
  }
}
