import { createErrorMessage } from '../../util/errors/ErrorUtil';
import type { SettingsExtractor } from './extractors/SettingsExtractor';
import { SettingsResolver } from './SettingsResolver';

/**
 * Generates variable values by running a set of {@link SettingsExtractor}s on the input.
 */
export class CombinedSettingsResolver extends SettingsResolver {
  public readonly computers: Record<string, SettingsExtractor>;

  public constructor(computers: Record<string, SettingsExtractor>) {
    super();
    this.computers = computers;
  }

  public async handle(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const vars: Record<string, any> = {};
    for (const [ name, computer ] of Object.entries(this.computers)) {
      try {
        vars[name] = await computer.handleSafe(input);
      } catch (err: unknown) {
        throw new Error(`Error in computing value for variable ${name}: ${createErrorMessage(err)}`);
      }
    }
    return vars;
  }
}
