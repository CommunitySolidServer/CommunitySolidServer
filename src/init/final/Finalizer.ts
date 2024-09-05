import { AsyncHandler } from 'asynchronous-handlers';

/**
 * Finalizer is used to indicate an AsyncHandler that performs finalization logic.
 */
export abstract class Finalizer extends AsyncHandler {}
