import { AsyncHandler } from './AsyncHandler';

/**
 * Caches output data from the source handler based on the input object.
 * The `field` parameter can be used to instead use a specific entry from the input object as cache key,
 * so has as actual required typing `keyof TIn`.
 *
 * A {@link WeakMap} is used internally so strict object equality determines cache hits,
 * and data will be removed once the key stops existing.
 * This also means that the cache key needs to be an object.
 * Errors will be thrown in case a primitve is used.
 */
export class CachedHandler<TIn, TOut = void> extends AsyncHandler<TIn, TOut> {
  private readonly source: AsyncHandler<TIn, TOut>;
  private readonly field?: string;

  private readonly cache: WeakMap<any, TOut>;

  public constructor(source: AsyncHandler<TIn, TOut>, field?: string) {
    super();
    this.source = source;
    this.field = field;
    this.cache = new WeakMap();
  }

  public async canHandle(input: TIn): Promise<void> {
    const key = this.getKey(input);

    if (this.cache.has(key)) {
      return;
    }
    return this.source.canHandle(input);
  }

  public async handle(input: TIn): Promise<TOut> {
    const key = this.getKey(input);

    let result = this.cache.get(key);
    if (result) {
      return result;
    }

    result = await this.source.handle(input);
    this.cache.set(key, result);

    return result;
  }

  protected getKey(input: TIn): any {
    return this.field ? input[this.field as keyof TIn] : input;
  }
}
