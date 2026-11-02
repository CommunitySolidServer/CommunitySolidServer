import type { PromiseCacheStore } from './PromiseCache';
import { PromiseCache } from './PromiseCache';

/** Options for the {@link cached} decorator. */
export interface CachedOptions<TThis, TArgs extends unknown[]> {
  /** Derives the cache key. Defaults to the first argument. */
  readonly key?: (this: TThis, ...args: TArgs) => unknown;
  /** Uses a `WeakMap`; requires object keys. */
  readonly weak?: boolean;
  /** Evicts rejected promises. Defaults to `true`. */
  readonly evictOnError?: boolean;
}

/**
 * Caches asynchronous method results per instance.
 */
export function cached<TThis extends object, TArgs extends unknown[], TValue>(
  options: CachedOptions<TThis, TArgs> = {},
): (target: (this: TThis, ...args: TArgs) => Promise<TValue>) => (this: TThis, ...args: TArgs) => Promise<TValue> {
  const caches = new WeakMap<TThis, PromiseCache<unknown, TValue>>();

  return (target: (this: TThis, ...args: TArgs) => Promise<TValue>):
  (this: TThis, ...args: TArgs) => Promise<TValue> =>
    // Returning the promise directly preserves its identity.
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    function(this: TThis, ...args: TArgs): Promise<TValue> {
      let cache = caches.get(this);
      if (!cache) {
        // The caller guarantees object keys when enabling `weak`.
        const store = options.weak ?
          new WeakMap<object, Promise<TValue>>() as unknown as PromiseCacheStore<unknown, Promise<TValue>> :
          new Map<unknown, Promise<TValue>>();
        cache = new PromiseCache<unknown, TValue>(store, { evictOnError: options.evictOnError });
        caches.set(this, cache);
      }
      const key = options.key ? options.key.apply(this, args) : args[0];
      return cache.getOrCreate(key, async(): Promise<TValue> => target.apply(this, args));
    };
}
