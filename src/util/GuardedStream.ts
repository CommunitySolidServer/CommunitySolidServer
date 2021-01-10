import { getLoggerFor } from '../logging/LogUtil';

const logger = getLoggerFor('GuardedStream');

// Using symbols to make sure we don't override existing parameters
const guardedErrors = Symbol('guardedErrors');
const guardedTimeout = Symbol('guardedTimeout');

let attachDefaultErrorListener: (this: Guarded, event: string) => void;

// Private fields for guarded streams
class Guard {
  private [guardedErrors]: Error[];
  private [guardedTimeout]?: NodeJS.Timeout;
}

/**
 * A stream that is guarded from emitting errors when there are no listeners.
 * If an error occurs while no listener is attached,
 * it will store the error and emit it once a listener is added (or a timeout occurs).
 */
export type Guarded<T extends NodeJS.EventEmitter = NodeJS.EventEmitter> = T & Guard;

/**
 * Determines whether the stream is guarded from emitting errors.
 */
export function isGuarded<T extends NodeJS.EventEmitter>(stream: T): stream is Guarded<T> {
  return typeof (stream as any)[guardedErrors] === 'object';
}

/**
 * Makes sure that listeners always receive the error event of a stream,
 * even if it was thrown before the listener was attached.
 * If the input is already guarded nothing will happen.
 * @param stream - Stream that can potentially throw an error.
 *
 * @returns The stream.
 */
export function guardStream<T extends NodeJS.EventEmitter>(stream: T): Guarded<T> {
  const guarded = stream as Guarded<T>;
  if (!isGuarded(stream)) {
    guarded[guardedErrors] = [];
    attachDefaultErrorListener.call(guarded, 'error');
  }
  return guarded;
}

/**
 * Callback that is used when a stream emits an error and no error listener is attached.
 * Used to store the error and start the logger timer.
 */
function defaultErrorListener(this: Guarded, error: Error): void {
  this[guardedErrors].push(error);
  if (!this[guardedTimeout]) {
    this[guardedTimeout] = setTimeout((): void => {
      const message = `No error listener was attached but error was thrown: ${error.message}`;
      logger.error(message, { error });
    }, 1000);
  }
}

/**
 * Callback that is used when a new listener is attached to remove the current error-related fallback functions,
 * or to emit an error if one was thrown in the meantime.
 */
function removeDefaultErrorListener(this: Guarded, event: string): void {
  if (event === 'error') {
    // Remove default guard listeners (but reattach when all error listeners are removed)
    this.removeListener('error', defaultErrorListener);
    this.removeListener('newListener', removeDefaultErrorListener);
    this.addListener('removeListener', attachDefaultErrorListener);

    // Cancel an error timeout
    if (this[guardedTimeout]) {
      clearTimeout(this[guardedTimeout]!);
      this[guardedTimeout] = undefined;
    }

    // Emit any errors that were guarded
    const errors = this[guardedErrors];
    if (errors.length > 0) {
      this[guardedErrors] = [];
      setImmediate((): void => {
        for (const error of errors) {
          this.emit('error', error);
        }
      });
    }
  }
}

/**
 * Callback that is used to make sure the error-related fallback functions are re-applied
 * when all error listeners are removed.
 */
attachDefaultErrorListener = function(this: Guarded, event: string): void {
  if (event === 'error' && this.listenerCount('error') === 0) {
    this.addListener('error', defaultErrorListener);
    this.addListener('newListener', removeDefaultErrorListener);
    this.removeListener('removeListener', attachDefaultErrorListener);
  }
};
