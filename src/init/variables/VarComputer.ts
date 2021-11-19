import type yargs from 'yargs';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * A handler that takes args, and returns computed variable value
 */
export abstract class VarComputer extends AsyncHandler<yargs.Arguments, unknown> {
}
