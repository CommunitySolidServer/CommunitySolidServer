/** Store operations required by {@link PromiseCache}. */
export interface PromiseCacheStore<TKey, TValue> {
  get: (key: TKey) => TValue | undefined;
  set: (key: TKey, value: TValue) => unknown;
  delete: (key: TKey) => unknown;
}

/** Options for {@link PromiseCache}. */
export interface PromiseCacheOptions {
  /** Evicts rejected promises. Defaults to `true`. */
  readonly evictOnError?: boolean;
}

/**
 * Deduplicates asynchronous computations by caching their promises.
 */
export class PromiseCache<TKey, TValue> {
  private readonly store: PromiseCacheStore<TKey, Promise<TValue>>;
  private readonly evictOnError: boolean;

  /**
   * @param store - Cache storage. Defaults to a new `Map`.
   * @param options - Cache options.
   */
  public constructor(
    store: PromiseCacheStore<TKey, Promise<TValue>> = new Map<TKey, Promise<TValue>>(),
    options: PromiseCacheOptions = {},
  ) {
    this.store = store;
    this.evictOnError = options.evictOnError ?? true;
  }

  /** Returns the cached promise, creating it on a miss. */
  // Returning the promise directly preserves its identity.
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  public getOrCreate(key: TKey, createPromise: (key: TKey) => Promise<TValue>): Promise<TValue> {
    const cached = this.store.get(key);
    if (cached) {
      return cached;
    }

    const promise = createPromise(key);
    this.store.set(key, promise);
    if (this.evictOnError) {
      promise.catch((): void => {
        if (this.store.get(key) === promise) {
          this.store.delete(key);
        }
      });
    }
    return promise;
  }
}
