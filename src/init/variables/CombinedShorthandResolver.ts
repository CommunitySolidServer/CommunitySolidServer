import { createErrorMessage } from '../../util/errors/ErrorUtil';
import type { ShorthandExtractor } from './extractors/ShorthandExtractor';
import { ShorthandResolver } from './ShorthandResolver';

/**
 * Generates variable values by running a set of {@link ShorthandExtractor}s on the input.
 */
export class CombinedShorthandResolver extends ShorthandResolver {
  public readonly resolvers: Record<string, ShorthandExtractor>;

  public constructor(resolvers: Record<string, ShorthandExtractor>) {
    super();
    this.resolvers = resolvers;
  }

  public async handle(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const vars: Record<string, unknown> = {};
    for (const [ name, computer ] of Object.entries(this.resolvers)) {
      try {
        vars[name] = await computer.handleSafe(input);
      } catch (err: unknown) {
        throw new Error(`Error in computing value for variable ${name}: ${createErrorMessage(err)}`);
      }
    }
    return vars;
  }
}
