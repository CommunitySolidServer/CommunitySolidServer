import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { KeyValueStorage } from './KeyValueStorage';

/**
 * Wrapper class that internally converts ResourceIdentifiers to strings so Storages
 * that do not check value equivalence can be used with ResourceIdentifiers.
 *
 * Specifically: this makes it so a Storage based on a Map object can be used with ResourceIdentifiers.
 */
export class ResourceIdentifierStorage<T> implements KeyValueStorage<ResourceIdentifier, T> {
  private readonly source: KeyValueStorage<string, T>;

  public constructor(source: KeyValueStorage<string, T>) {
    this.source = source;
  }

  public async get(key: ResourceIdentifier): Promise<T | undefined> {
    return this.source.get(key.path);
  }

  public async has(key: ResourceIdentifier): Promise<boolean> {
    return this.source.has(key.path);
  }

  public async set(key: ResourceIdentifier, value: T): Promise<this> {
    await this.source.set(key.path, value);
    return this;
  }

  public async delete(key: ResourceIdentifier): Promise<boolean> {
    return this.source.delete(key.path);
  }

  public async* entries(): AsyncIterableIterator<[ResourceIdentifier, T]> {
    for await (const [ path, value ] of this.source.entries()) {
      yield [{ path }, value ];
    }
  }
}
