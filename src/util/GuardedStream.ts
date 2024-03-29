import { getLoggerFor } from '../logging/LogUtil';

const logger = getLoggerFor('GuardedStream');

// Using symbols to make sure we don't override existing parameters
const guardedErrors = Symbol('guardedErrors');
const guardedTimeout = Symbol('guardedTimeout');

// Private fields for guarded streams
class Guard {
  // Workaround for the fact that we don't initialize this variable as expected
  declare private [guardedErrors]: Error[];
  private [guardedTimeout]?: NodeJS.Timeout;
}

/**
 * A stream that is guarded from emitting errors when there are no listeners.
 * If an error occurs while no listener is attached,
 * it will store the error and emit it once a listener is added (or a timeout occurs).
 */
export type Guarded<T extends NodeJS.EventEmitter = NodeJS.EventEmitter> = T & Guard;

/**
 * Determines whether the stream is guarded against emitting errors.
 */
export function isGuarded<T extends NodeJS.EventEmitter>(stream: T): stream is Guarded<T> {
  return typeof (stream as unknown as Guarded)[guardedErrors] === 'object';
}

/**
 * Callback that is used when a stream emits an error and no other error listener is attached.
 * Used to store the error and start the logger timer.
 *
 * It is important that this listener always remains attached for edge cases where an error listener gets removed
 * and the number of error listeners is checked immediately afterwards.
 * See https://github.com/CommunitySolidServer/CommunitySolidServer/pull/462#issuecomment-758013492 .
 */
function guardingErrorListener(this: Guarded, error: Error): void {
  // Only fall back to this if no new listeners are attached since guarding started.
  const errorListeners = this.listeners('error');
  if (errorListeners.at(-1) === guardingErrorListener) {
    this[guardedErrors].push(error);
    if (!this[guardedTimeout]) {
      this[guardedTimeout] = setTimeout((): void => {
        logger.error(`No error listener was attached but error was thrown: ${error.message}`);
      }, 1000);
    }
  }
}

/**
 * Callback that is used when a new listener is attached and there are errors that were not emitted yet.
 */
function emitStoredErrors(this: Guarded, event: string, func: (error: Error) => void): void {
  if (event === 'error' && func !== guardingErrorListener) {
    // Cancel an error timeout
    if (this[guardedTimeout]) {
      clearTimeout(this[guardedTimeout]);
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
 * Makes sure that listeners always receive the error event of a stream,
 * even if it was thrown before the listener was attached.
 *
 * When guarding a stream it is assumed that error listeners already attached should be ignored,
 * only error listeners attached after the stream is guarded will prevent an error from being logged.
 *
 * If the input is already guarded the guard will be reset,
 * which means ignoring error listeners already attached.
 *
 * @param stream - Stream that can potentially throw an error.
 *
 * @returns The stream.
 */
export function guardStream<T extends NodeJS.EventEmitter>(stream: T): Guarded<T> {
  const guarded = stream as Guarded<T>;
  if (isGuarded(stream)) {
    // This makes sure the guarding error listener is the last one in the list again
    guarded.removeListener('error', guardingErrorListener);
    guarded.on('error', guardingErrorListener);
  } else {
    guarded[guardedErrors] = [];
    guarded.on('error', guardingErrorListener);
    guarded.on('newListener', emitStoredErrors);
  }
  return guarded;
}
