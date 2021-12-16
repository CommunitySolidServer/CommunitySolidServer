import { ValueComputer } from './ValueComputer';

/**
 * A simple {@link ValueComputer} that extracts a single value from the input map.
 * Returns the default value if it was defined in case no value was found in the map.
 */
export class ArgExtractor extends ValueComputer {
  private readonly key: string;
  private readonly defaultValue: unknown;

  public constructor(key: string, defaultValue?: unknown) {
    super();
    this.key = key;
    this.defaultValue = defaultValue;
  }

  public async handle(args: Record<string, unknown>): Promise<unknown> {
    return typeof args[this.key] === 'undefined' ? this.defaultValue : args[this.key];
  }
}
