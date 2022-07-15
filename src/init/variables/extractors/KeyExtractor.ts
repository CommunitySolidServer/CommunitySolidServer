import type { Shorthand } from '../Types';
import { ShorthandExtractor } from './ShorthandExtractor';

/**
 * A simple {@link ShorthandExtractor} that extracts a single value from the input map.
 * Returns the default value if it was defined in case no value was found in the map.
 */
export class KeyExtractor extends ShorthandExtractor {
  private readonly key: string;
  private readonly defaultValue: unknown;

  public constructor(key: string, defaultValue?: unknown) {
    super();
    this.key = key;
    this.defaultValue = defaultValue;
  }

  public async handle(args: Shorthand): Promise<unknown> {
    return typeof args[this.key] === 'undefined' ? this.defaultValue : args[this.key];
  }
}
