import type { KeyValueStorage } from './KeyValueStorage';

/**
 * A {@link KeyValueStorage} which uses a JavaScript Map for internal storage.
 */
export class MemoryMapStorage<TValue> implements KeyValueStorage<string, TValue> {
  private readonly data: Map<string, TValue>;

  public constructor() {
    this.data = new Map<string, TValue>();
  }

  public async get(key: string): Promise<TValue | undefined> {
    return this.data.get(key);
  }

  public async has(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  public async set(key: string, value: TValue): Promise<this> {
    this.data.set(key, value);
    return this;
  }

  public async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  public async* entries(): AsyncIterableIterator<[string, TValue]> {
    for (const entry of this.data.entries()) {
      yield entry;
    }
  }
}
