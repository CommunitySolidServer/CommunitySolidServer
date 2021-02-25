import type { KeyValueStorage } from './KeyValueStorage';

/**
 * A {@link KeyValueStorage} which uses a JavaScript Map for internal storage.
 * Warning: Uses a Map object, which internally uses `Object.is` for key equality,
 * so object keys have to be the same objects.
 */
export class MemoryMapStorage<TKey, TValue> implements KeyValueStorage<TKey, TValue> {
  private readonly data: Map<TKey, TValue>;

  public constructor() {
    this.data = new Map<TKey, TValue>();
  }

  public async get(key: TKey): Promise<TValue | undefined> {
    return this.data.get(key);
  }

  public async has(key: TKey): Promise<boolean> {
    return this.data.has(key);
  }

  public async set(key: TKey, value: TValue): Promise<this> {
    this.data.set(key, value);
    return this;
  }

  public async delete(key: TKey): Promise<boolean> {
    return this.data.delete(key);
  }

  public async* entries(): AsyncIterableIterator<[TKey, TValue]> {
    for (const entry of this.data.entries()) {
      yield entry;
    }
  }
}
