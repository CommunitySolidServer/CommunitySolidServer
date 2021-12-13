import { VarComputer } from '../VarComputer';

/**
 * Simple VarComputer that just extracts an arg from parsed args.
 */
export class ArgExtractor extends VarComputer {
  private readonly argKey: string;

  public constructor(argKey: string) {
    super();
    this.argKey = argKey;
  }

  public async handle(args: Record<string, unknown>): Promise<unknown> {
    return args[this.argKey];
  }
}
