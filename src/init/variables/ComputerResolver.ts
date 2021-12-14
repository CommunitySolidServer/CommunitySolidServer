import { createErrorMessage } from '../../util/errors/ErrorUtil';
import type { ValueComputer } from './computers/ValueComputer';
import { VariableResolver } from './VariableResolver';

/**
 * Generates variable values by running a set of {@link ValueComputer}s on the input.
 */
export class ComputerResolver extends VariableResolver {
  public readonly computers: Record<string, ValueComputer>;

  public constructor(computers: Record<string, ValueComputer>) {
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
