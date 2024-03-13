import type { SetMultiMap } from './SetMultiMap';

/**
 * A {@link SetMultiMap} that uses an internal Map based on the provided constructor.
 *
 * In case no input constructor is provided, the default Map implementation will be used.
 *
 * It is required that the value type of this map is not Set or any extension of Set,
 * otherwise the `set` and `add` functions wil break.
 */
export class WrappedSetMultiMap<TKey, TVal> implements SetMultiMap<TKey, TVal> {
  private count: number;
  private readonly map: Map<TKey, Set<TVal>>;

  /**
   * @param mapConstructor - Will be used to instantiate the internal Map.
   * @param iterable - Entries to add to the map.
   */
  public constructor(
    mapConstructor: new() => Map<TKey, Set<TVal>> = Map,
    iterable?: Iterable<readonly [TKey, TVal | ReadonlySet<TVal>]>,
  ) {
    // eslint-disable-next-line new-cap
    this.map = new mapConstructor();
    this.count = 0;

    if (iterable) {
      for (const [ key, val ] of iterable) {
        this.add(key, val);
      }
    }
  }

  public has(key: TKey): boolean {
    return this.map.has(key);
  }

  public hasEntry(key: TKey, value: TVal): boolean {
    return Boolean(this.map.get(key)?.has(value));
  }

  public get(key: TKey): ReadonlySet<TVal> | undefined {
    return this.map.get(key);
  }

  public set(key: TKey, value: ReadonlySet<TVal> | TVal): this {
    const setCount = this.get(key)?.size ?? 0;
    const set = value instanceof Set ? new Set<TVal>(value) : new Set([ value as TVal ]);
    this.count += set.size - setCount;
    if (set.size > 0) {
      this.map.set(key, set);
    } else {
      this.map.delete(key);
    }

    return this;
  }

  public add(key: TKey, value: TVal | ReadonlySet<TVal>): this {
    const it = value instanceof Set ? value as Set<TVal> : [ value as TVal ];
    let set = this.map.get(key);
    if (set) {
      const originalCount = set.size;
      for (const entry of it) {
        set.add(entry);
      }
      this.count += set.size - originalCount;
    } else {
      set = new Set(it);
      this.count += set.size;
      this.map.set(key, set);
    }

    return this;
  }

  public delete(key: TKey): boolean {
    const setCount = this.get(key)?.size ?? 0;
    const existed = this.map.delete(key);
    this.count -= setCount;
    return existed;
  }

  public deleteEntry(key: TKey, value: TVal): boolean {
    const set = this.map.get(key);
    if (set?.delete(value)) {
      this.count -= 1;
      if (set.size === 0) {
        this.map.delete(key);
      }
      return true;
    }
    return false;
  }

  public clear(): void {
    this.map.clear();
    this.count = 0;
  }

  public asMap(): ReadonlyMap<TKey, ReadonlySet<TVal>> {
    return this.map;
  }

  public [Symbol.iterator](): IterableIterator<[TKey, TVal]> {
    return this.entries();
  }

  public* entries(): IterableIterator<[TKey, TVal]> {
    for (const [ key, set ] of this.map) {
      for (const value of set) {
        yield [ key, value ];
      }
    }
  }

  public* entrySets(): IterableIterator<[TKey, ReadonlySet<TVal>]> {
    yield* this.map.entries();
  }

  public* keys(): IterableIterator<TKey> {
    for (const [ key ] of this.entries()) {
      yield key;
    }
  }

  public distinctKeys(): IterableIterator<TKey> {
    return this.map.keys();
  }

  public* values(): IterableIterator<TVal> {
    for (const [ , value ] of this.entries()) {
      yield value;
    }
  }

  public valueSets(): IterableIterator<ReadonlySet<TVal>> {
    return this.map.values();
  }

  public forEach(callbackfn: (value: TVal, key: TKey, map: SetMultiMap<TKey, TVal>) => void, thisArg?: unknown): void {
    for (const [ key, value ] of this) {
      callbackfn.bind(thisArg)(value, key, this);
    }
  }

  public get size(): number {
    return this.count;
  }

  public readonly [Symbol.toStringTag] = 'WrappedSetMultiMap';
}
