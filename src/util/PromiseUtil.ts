/**
 * A replacement for the Promise.any() function, which is only supported
 * by NodeJs starting from version 15.0.0.
 *
 * @remarks
 *
 * Predicates provided as input must be implemented considering
 * the following points:
 * 1. if they throw an error, it won't be propagated;
 * 2. throwing an error should be logically equivalent to return false.
 */
export async function promiseAny(predicates: Promise<boolean>[]): Promise<boolean> {
  try {
    await Promise.all(predicates.map(async(predicate): Promise<boolean> => {
      try {
        if (await predicate) {
          /**
           * The predicate returned true: we return a rejected promise
           * so that Promise.all() will immediately stop.
           */
          return Promise.reject(new Error('At least a promise was fulfilled with true.'));
        }
        /**
         * The predicate returned false: we return a resolved promise
         * so that Promise.all() will continue executing.
         */
        return Promise.resolve(false);
      } catch {
        // The predicate threw an error: we treat it as if it returned false.
        return Promise.resolve(false);
      }
    }));

    /**
     * Promise.all() terminated successfully: this means that
     * every promise was fulfilled with false.
     */
    return false;
  } catch {
    /**
     * Promise.all() terminated earlier then expected because
     * of a rejected promise: this means that at least one
     * promise was fulfilled with true.
     */
    return true;
  }
}
