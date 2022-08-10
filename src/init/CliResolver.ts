import type { CliExtractor } from './cli/CliExtractor';
import type { ShorthandResolver } from './variables/ShorthandResolver';

/**
 * A class that combines a {@link CliExtractor} and a {@link ShorthandResolver}.
 * Mainly exists so both such classes can be generated in a single Components.js instance.
 */
export class CliResolver {
  public readonly cliExtractor: CliExtractor;
  public readonly shorthandResolver: ShorthandResolver;

  public constructor(cliExtractor: CliExtractor, shorthandResolver: ShorthandResolver) {
    this.cliExtractor = cliExtractor;
    this.shorthandResolver = shorthandResolver;
  }
}
