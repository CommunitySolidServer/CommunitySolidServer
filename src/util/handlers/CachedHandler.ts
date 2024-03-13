import { AsyncHandler } from './AsyncHandler';

type NestedMap<TOut> = TOut | WeakMap<object, NestedMap<TOut>>;

/**
 * Caches output data from the source handler based on the input object.
 * The `fields` parameter can be used to instead use one or more specific entries from the input object as cache key,
 * so has as actual required typing `(keyof TIn)[]`.
 *
 * A {@link WeakMap} is used internally so strict object equality determines cache hits,
 * and data will be removed once the key stops existing.
 * This also means that the cache key needs to be an object.
 * Errors will be thrown in case a primitive is used.
 */
export class CachedHandler<TIn extends Record<string, unknown>, TOut = void> extends AsyncHandler<TIn, TOut> {
  private readonly source: AsyncHandler<TIn, TOut>;
  private readonly fields?: [keyof TIn, ...(keyof TIn)[]];

  private readonly cache: WeakMap<object, NestedMap<TOut>>;

  public constructor(source: AsyncHandler<TIn, TOut>, fields?: string[]) {
    super();
    this.source = source;
    if (fields) {
      if (fields.length === 0) {
        throw new Error('The fields parameter needs to have at least 1 entry if defined.');
      }
      // This is the first of many casts in this class.
      // All of them are 100% correct though and are a consequence
      // of the cache depth depending on the length of `fields`
      // and the Node.js array functions not always having strict enough typings.
      this.fields = fields as [keyof TIn, ...(keyof TIn)[]];
    }
    this.cache = new WeakMap();
  }

  public async canHandle(input: TIn): Promise<void> {
    const keys = this.getKeys(input);
    const map = this.findDestination(input, keys, this.cache);

    if (map?.has(keys.pop()!)) {
      return;
    }

    return this.source.canHandle(input);
  }

  public async handle(input: TIn): Promise<TOut> {
    const keys = this.getKeys(input);
    const map = this.findDestination(input, keys, this.cache, true)!;

    const key = keys.pop()!;
    let result = map.get(key);
    if (result) {
      return result;
    }

    result = await this.source.handle(input);
    map.set(key, result);

    return result;
  }

  /**
   * Extracts the values that will be used as keys from the input object.
   * In case the `fields` value was undefined, this will return an array containing the input object itself.
   */
  protected getKeys(input: TIn): [object, ...object[]] {
    if (!this.fields) {
      return [ input ];
    }

    return this.fields.map((field): object => input[field] as object) as [object, ...object[]];
  }

  /**
   * Returns the `WeakMap` that contains actual objects that were cached,
   * so the last `WeakMap` in the chain of maps.
   *
   * Returns `undefined` if no such map exists because earlier keys were not cached.
   *
   * Will always return a map if `ensure` is set to true,
   * in such a case the intermediate maps will be created and added to the previous map.
   */
  protected findDestination(input: TIn, keys: object[], cache: WeakMap<object, NestedMap<TOut>>, ensure = false):
  WeakMap<object, TOut> | undefined {
    if (keys.length === 1) {
      return cache as WeakMap<object, TOut>;
    }

    const key = keys[0];
    let nextCache = cache.get(key) as WeakMap<object, NestedMap<TOut>> | undefined;
    if (!nextCache) {
      if (!ensure) {
        return;
      }
      nextCache = new WeakMap<object, NestedMap<TOut>>();
      cache.set(key, nextCache);
    }

    return this.findDestination(input, keys.slice(1), nextCache, ensure);
  }
}
