import { getLoggerFor } from '../logging/LogUtil';

// Until Typescript adds Nominal types this is how to do it.
// This can be generalized should we need it in the future for other cases.
// Also using the guard to store the intermediate variables.
// See the following issue:
//   https://github.com/microsoft/TypeScript/issues/202

const logger = getLoggerFor('GuardedStream');

// Using symbols to make sure we don't override existing parameters
const guard = Symbol('guard');
const errorGuard = Symbol('error');
const timeoutGuard = Symbol('timeout');

// Class used to guard streams
class Guard {
  protected [guard]: boolean;
}

// Hidden interface for guard-related variables
interface StoredErrorStream extends NodeJS.EventEmitter {
  [errorGuard]?: Error;
  [timeoutGuard]?: NodeJS.Timeout;
}

/**
 * A stream that is guarded.
 * This means that if this stream emits an error before a listener is attached,
 * it will store the error and emit it once a listener is added.
 */
export type Guarded<T extends NodeJS.EventEmitter> = T & Guard;

/**
 * Callback that is used when a stream emits an error and no error listener is attached.
 * Used to store the error and start the logger timer.
 */
const defaultErrorListener = function(this: StoredErrorStream, err: Error): void {
  this[errorGuard] = err;
  this[timeoutGuard] = setTimeout((): void => {
    logger.error(`No error listener was attached but error was thrown: ${err.message}`);
  }, 1000);
};

let attachDefaultErrorListener: (this: StoredErrorStream, event: string) => void;

/**
 * Callback that is used when a new listener is attached to remove the current error-related fallback functions,
 * or to emit an error if one was thrown in the meantime.
 */
const removeDefaultErrorListener = function(this: StoredErrorStream, event: string, listener: (err: Error) => void):
void {
  if (event === 'error') {
    this.removeListener('error', defaultErrorListener);
    this.removeListener('newListener', removeDefaultErrorListener);
    this.on('removeListener', attachDefaultErrorListener);
    if (this[timeoutGuard]) {
      clearTimeout(this[timeoutGuard]!);
    }
    if (this[errorGuard]) {
      setImmediate((): void => listener(this[errorGuard]!));
    }
  }
};

/**
 * Callback that is used to make sure the error-related fallback functions are re-applied
 * when all error listeners are removed.
 */
attachDefaultErrorListener = function(this: StoredErrorStream, event: string): void {
  if (event === 'error' && this.listenerCount('error') === 0) {
    this.on('error', defaultErrorListener);
    this.on('newListener', removeDefaultErrorListener);
    this.removeListener('removeListener', attachDefaultErrorListener);
  }
};

/**
 * Makes sure that listeners always receive the error event of a stream,
 * even if it was thrown before the listener was attached.
 * If the input is already guarded nothing will happen.
 * @param stream - Stream that can potentially throw an error.
 *
 * @returns The wrapped stream.
 */
export const guardStream = <T extends NodeJS.EventEmitter>(stream: T): Guarded<T> => {
  const guarded = stream as Guarded<T>;
  if (guarded[guard]) {
    return guarded;
  }

  guarded.on('error', defaultErrorListener);
  guarded.on('newListener', removeDefaultErrorListener);

  guarded[guard] = true;
  return guarded;
};
