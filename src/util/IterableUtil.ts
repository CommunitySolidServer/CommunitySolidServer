// Utility functions for iterables that avoid array conversion

/**
 * Creates a new iterable with the results of calling a provided function on every element in the calling array.
 * Similar to the {@link Array.prototype.map} function.
 * See the documentation of the above function for more details.
 *
 * @param iterable - Iterable on which to call the map function.
 * @param callbackFn - Function that is called for every element.
 * @param thisArg - Value to use as `this` when executing `callbackFn`.
 */
export function* map<TIn, TOut>(
  iterable: Iterable<TIn>,
  callbackFn: (element: TIn, index: number) => TOut,
  thisArg?: unknown,
): Iterable<TOut> {
  const boundMapFn = callbackFn.bind(thisArg);
  let count = 0;
  for (const value of iterable) {
    yield boundMapFn(value, count);
    count += 1;
  }
}

/**
 * Creates a new iterable with all elements that pass the test implemented by the provided function.
 * Similar to the {@link Array.prototype.filter} function.
 * See the documentation of the above function for more details.
 *
 * @param iterable - Iterable on which to call the map function.
 * @param callbackFn - Function that is called to test every element.
 * @param thisArg - Value to use as `this` when executing `callbackFn`.
 */
export function* filter<T>(
  iterable: Iterable<T>,
  callbackFn: (element: T, index: number) => boolean,
  thisArg?: unknown,
): Iterable<T> {
  const boundFilterFn = callbackFn.bind(thisArg);
  let count = 0;
  for (const value of iterable) {
    if (boundFilterFn(value, count)) {
      yield value;
    }
    count += 1;
  }
}

/**
 * Creates a new iterable that is a concatenation of all the iterables in the input.
 *
 * @param iterables - An iterable of which the contents will be concatenated into a new iterable.
 */
export function* concat<T>(iterables: Iterable<Iterable<T>>): Iterable<T> {
  for (const iterable of iterables) {
    yield* iterable;
  }
}

/**
 * Returns the first element in the provided iterable that satisfies the provided testing function.
 * If no values satisfy the testing function, `undefined` is returned.
 * Similar to the {@link Array.prototype.find} function.
 * See the documentation of the above function for more details.
 *
 * @param iterable - Iterable on which to call the map function.
 * @param callbackFn - Function that is called to test every element.
 * @param thisArg - Value to use as `this` when executing `callbackFn`.
 */
export function find<T>(iterable: Iterable<T>, callbackFn: (element: T, index: number) => boolean, thisArg?: unknown):
T | undefined {
  const boundMapFn = callbackFn.bind(thisArg);
  const count = 0;
  for (const value of iterable) {
    if (boundMapFn(value, count)) {
      return value;
    }
  }
}

/**
 * Similar to the {@link Array.prototype.reduce} function, but for an iterable.
 * See the documentation of the above function for more details.
 * The first element will be used as the initial value.
 *
 * @param iterable - Iterable of which to reduce the elements.
 * @param callbackFn - A reducer function.
 */
export function reduce<TIn>(iterable: Iterable<TIn>,
  callbackFn: (previousValue: TIn, currentValue: TIn, currentIndex: number) => TIn): TIn;
/**
 * Similar to the {@link Array.prototype.reduce} function, but for an iterable.
 * See the documentation of the above function for more details.
 *
 * @param iterable - Iterable of which to reduce the elements.
 * @param callbackFn - A reducer function.
 * @param initialValue - The value to start from.
 */
export function reduce<TIn, TOut>(
  iterable: Iterable<TIn>,
  callbackFn: (previousValue: TOut, currentValue: TIn, currentIndex: number) => TOut, initialValue: TOut
): TOut;
export function reduce<TIn, TOut>(
  iterable: Iterable<TIn>,
  callbackFn: (previousValue: TOut, currentValue: TIn, currentIndex: number) => TOut,
  initialValue?: TOut,
): TOut {
  const iterator = iterable[Symbol.iterator]();
  let count = 0;
  if (!initialValue) {
    const next = iterator.next();
    if (next.done) {
      throw new TypeError('Iterable is empty and no initial value was provided.');
    }
    // `initialValue` being undefined means the first signature was used where TIn === TOut
    initialValue = next.value as unknown as TOut;
    count += 1;
  }
  let previousValue = initialValue;
  let next = iterator.next();
  while (!next.done) {
    previousValue = callbackFn(previousValue, next.value, count);
    next = iterator.next();
    count += 1;
  }
  return previousValue;
}

/**
 * Helper function for {@link sortedAsyncMerge}.
 *
 * Returns the next result of an AsyncIterator, or undefined if the iterator is finished.
 */
async function nextAsyncEntry<T>(iterator: AsyncIterator<T>): Promise<T | undefined> {
  const result = await iterator.next();
  if (result.done) {
    return;
  }
  return result.value;
}

/**
 * Helper function for {@link sortedAsyncMerge}.
 *
 * Compares the next results of all `iterators` and returns the first one,
 * determined by the provided `comparator`.
 *
 * `results` should contain the first result of all these iterators.
 * This array will also be updated, replacing the result of the iterator whose result was chosen by the next one.
 */
async function findNextSorted<T>(
  iterators: AsyncIterator<T>[],
  results: (T | undefined)[],
  comparator: (left: T, right: T) => number,
): Promise<T | undefined> {
  let best: { idx: number; value: T } | undefined;
  // For every iterator: see if their next result is the best one so far
  for (let i = 0; i < iterators.length; ++i) {
    const value = results[i];
    if (typeof value !== 'undefined') {
      let compare = 1;
      if (best) {
        compare = comparator(best.value, value);
      }

      if (compare > 0) {
        best = { idx: i, value };
      }
    }
  }

  if (best) {
    // Advance the iterator that returned the new result
    results[best.idx] = await nextAsyncEntry(iterators[best.idx]);
  }

  // Will return undefined if `best` was never initialized above
  return best?.value;
}

/**
 * Merges the results of several sorted iterators.
 * In case the results of the individual iterators are not sorted the outcome results will also not be sorted.
 *
 * @param iterators - The iterators whose results need to be merged.
 * @param comparator - The comparator to use to compare the results.
 */
export async function* sortedAsyncMerge<T>(iterators: AsyncIterator<T>[], comparator?: (left: T, right: T) => number):
AsyncIterable<T> {
  if (!comparator) {
    comparator = (left, right): number => {
      if (left < right) {
        return -1;
      }
      return left > right ? 1 : 0;
    };
  }

  // Initialize the array to the first result of every iterator
  const results: (T | undefined)[] = [];
  for (const iterator of iterators) {
    results.push(await nextAsyncEntry(iterator));
  }

  // Keep returning results as long as we find them
  while (true) {
    const next = await findNextSorted(iterators, results, comparator);
    if (typeof next === 'undefined') {
      return;
    }
    yield next;
  }
}

/**
 * Converts an `AsyncIterator` to an array.
 */
export async function asyncToArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const arr: T[] = [];
  for await (const result of iterable) {
    arr.push(result);
  }
  return arr;
}
