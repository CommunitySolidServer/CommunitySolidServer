import { createErrorMessage } from '../../util/errors/ErrorUtil';
import type { SettingsExtractor } from './extractors/SettingsExtractor';
import { SettingsResolver } from './SettingsResolver';

/**
 * Generates variable values by running a set of {@link SettingsExtractor}s on the input.
 */
export class CombinedSettingsResolver extends SettingsResolver {
  public readonly resolvers: Record<string, SettingsExtractor>;

  public constructor(resolvers: Record<string, SettingsExtractor>) {
    super();
    this.resolvers = resolvers;
  }

  public async handle(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const vars: Record<string, any> = {};
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
