import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 A handler that determines the value of a specific variable from parsed cli arguments.
 */
export abstract class VarComputer extends AsyncHandler<Record<string, unknown>, unknown> {
}
