import { types } from 'node:util';
import { createAggregateError } from './errors/HttpErrorUtil';

export type PromiseOrValue<T> = T | Promise<T>;

/**
 * Verifies if the given value is a Promise or not.
 *
 * @param object - Object to check.
 */
export function isPromise<T>(object: PromiseOrValue<T>): object is Promise<T> {
  return types.isPromise(object);
}

/**
 * Calls `callback` with the resolved value of `object`.
 * In case `object` is a Promise, the result will also be a Promise,
 * otherwise the result will be sync.
 */
export function resolvePromiseOrValue<TIn, TOut>(object: PromiseOrValue<TIn>, callback: (val: TIn) => TOut):
PromiseOrValue<TOut> {
  if (isPromise(object)) {
    return object.then((val): TOut => callback(val));
  }
  return callback(object);
}

function noop(): void {}

/**
 * A function that simulates the Array.some behaviour but on an array of Promises.
 * Returns true if at least one promise returns true.
 * Returns false if all promises return false or error.
 *
 * @remarks
 *
 * Predicates provided as input must be implemented considering
 * the following points:
 * 1. if they throw an error, it won't be propagated;
 * 2. throwing an error should be logically equivalent to returning false.
 */
export async function promiseSome(predicates: Promise<boolean>[]): Promise<boolean> {
  return new Promise((resolve): void => {
    function resolveIfTrue(value: boolean): void {
      if (value) {
        resolve(true);
      }
    }
    Promise.all(predicates.map(async(predicate): Promise<void> => predicate.then(resolveIfTrue, noop)))
      .then((): void => resolve(false), noop);
  });
}

/**
 * Obtains the values of all fulfilled promises.
 * If there are rejections (and `ignoreErrors` is false), throws a combined error of all rejected promises.
 */
export async function allFulfilled<T>(promises: Promise<T> [], ignoreErrors = false): Promise<T[]> {
  // Collect values and errors
  const values: T[] = [];
  const errors: Error[] = [];
  for (const result of await Promise.allSettled(promises)) {
    if (result.status === 'fulfilled') {
      values.push(result.value);
    } else if (!ignoreErrors) {
      errors.push(result.reason as Error);
    }
  }

  // Either throw or return
  if (errors.length > 0) {
    throw createAggregateError(errors);
  }
  return values;
}
