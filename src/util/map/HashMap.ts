import { map } from '../IterableUtil';

type Entry<TKey, TVal> = { key: TKey; value: TVal };

/**
 * A {@link Map} implementation that maps the Key object to a string using the provided hash function.
 * This ensures that equal objects that are not the same instance are mapped to the same value.
 */
export class HashMap<TKey = unknown, TVal = unknown> implements Map<TKey, TVal> {
  private readonly hashMap: Map<string, Entry<TKey, TVal>>;
  private readonly hashFn: (key: TKey) => string;

  public constructor(hashFn: (key: TKey) => string, iterable?: Iterable<readonly [TKey, TVal]>) {
    this.hashFn = hashFn;

    if (iterable) {
      this.hashMap = new Map(map(iterable, ([ key, value ]): [string, Entry<TKey, TVal>] =>
        [ this.hashFn(key), { key, value }]));
    } else {
      this.hashMap = new Map();
    }
  }

  public has(key: TKey): boolean {
    return this.hashMap.has(this.hashFn(key));
  }

  public get(key: TKey): TVal | undefined {
    return this.hashMap.get(this.hashFn(key))?.value;
  }

  public set(key: TKey, value: TVal): this {
    this.hashMap.set(this.hashFn(key), { key, value });
    return this;
  }

  public delete(key: TKey): boolean {
    return this.hashMap.delete(this.hashFn(key));
  }

  public clear(): void {
    this.hashMap.clear();
  }

  public [Symbol.iterator](): IterableIterator<[TKey, TVal]> {
    return this.entries();
  }

  public* entries(): IterableIterator<[TKey, TVal]> {
    for (const [ , { key, value }] of this.hashMap) {
      yield [ key, value ];
    }
  }

  public* keys(): IterableIterator<TKey> {
    for (const [ , { key }] of this.hashMap) {
      yield key;
    }
  }

  public* values(): IterableIterator<TVal> {
    for (const [ , { value }] of this.hashMap) {
      yield value;
    }
  }

  public forEach(callbackfn: (value: TVal, key: TKey, map: Map<TKey, TVal>) => void, thisArg?: unknown): void {
    for (const [ key, value ] of this) {
      callbackfn.bind(thisArg)(value, key, this);
    }
  }

  public get size(): number {
    return this.hashMap.size;
  }

  public readonly [Symbol.toStringTag] = 'HashMap';
}
