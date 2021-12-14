import { ValueComputer } from './ValueComputer';

/**
 * Simple VarComputer that just extracts an arg from parsed args.
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
