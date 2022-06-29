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
export function* map<TIn, TOut>(iterable: Iterable<TIn>, callbackFn: (element: TIn, index: number) => TOut,
  thisArg?: any): Iterable<TOut> {
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
export function* filter<T>(iterable: Iterable<T>, callbackFn: (element: T, index: number) => boolean,
  thisArg?: any): Iterable<T> {
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
 * @param iterables - An iterable of which the contents will be concatenated into a new iterable.
 */
export function* concat<T>(iterables: Iterable<Iterable<T>>): Iterable<T> {
  for (const iterable of iterables) {
    yield* iterable;
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
export function reduce<TIn, TOut>(iterable: Iterable<TIn>,
  callbackFn: (previousValue: TOut, currentValue: TIn, currentIndex: number) => TOut, initialValue: TOut): TOut;
export function reduce<TIn, TOut>(iterable: Iterable<TIn>,
  callbackFn: (previousValue: TOut, currentValue: TIn, currentIndex: number) => TOut, initialValue?: TOut): TOut {
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
