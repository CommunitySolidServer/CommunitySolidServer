// eslint-disable-next-line @typescript-eslint/no-empty-function
const infinitePromise = new Promise<boolean>((): void => {});

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
  // These promises will only finish when their predicate returns true
  const infinitePredicates = predicates.map(async(predicate): Promise<boolean> => predicate.then(
    async(value): Promise<boolean> => value ? true : infinitePromise,
    async(): Promise<boolean> => infinitePromise,
  ));

  // Returns after all predicates are resolved
  const finalPromise = Promise.allSettled(predicates).then((results): boolean =>
    results.some((result): boolean => result.status === 'fulfilled' && result.value));

  // Either one of the infinitePredicates will return true,
  // or finalPromise will return the result if none of them did or finalPromise was faster
  return Promise.race([ ...infinitePredicates, finalPromise ]);
}
