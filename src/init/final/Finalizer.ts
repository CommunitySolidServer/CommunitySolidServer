import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * Finalizer is used to indicate an AsyncHandler that performs finalization logic.
 */
export abstract class Finalizer extends AsyncHandler {}
