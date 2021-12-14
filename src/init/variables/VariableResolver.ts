import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * Converts a key/value object, extracted from the CLI or passed as a parameter,
 * into a new key/value object where the keys are variables defined in the Components.js configuration.
 * The resulting values are the values that should be assigned to those variables.
 */
export abstract class VariableResolver extends AsyncHandler<Record<string, unknown>, Record<string, unknown>> {}
