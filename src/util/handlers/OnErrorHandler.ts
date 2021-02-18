import { AsyncHandler } from './AsyncHandler';

/**
 * A handler that gets triggered when an error is met in the
 * ErrorHandlingWaterfallHandler.
 */
export abstract class OnErrorHandler<TIn, TOut> extends AsyncHandler<{ error: unknown; input: TIn }, TOut> {}
