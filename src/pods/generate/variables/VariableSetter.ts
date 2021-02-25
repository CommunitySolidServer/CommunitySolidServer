import type { PodSettings } from '../../settings/PodSettings';
import { VariableHandler } from './VariableHandler';

/**
 * A VariableHandler that will set the given variable to the given value,
 * unless there already is a value for the variable and override is false.
 */
export class VariableSetter extends VariableHandler {
  private readonly variable: string;
  private readonly value: string;
  private readonly override: boolean;

  public constructor(variable: string, value: string, override = false) {
    super();
    this.variable = variable;
    this.value = value;
    this.override = override;
  }

  public async handle({ settings }: { settings: PodSettings }): Promise<void> {
    if (this.override || !settings[this.variable]) {
      settings[this.variable] = this.value;
    }
  }
}
