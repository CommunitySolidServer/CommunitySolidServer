import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { ResourceSet } from './ResourceSet';

/**
 * Caches resource existence in a `WeakMap` tied to the `ResourceIdentifier` object.
 */
export class CachedResourceSet implements ResourceSet {
  private readonly source: ResourceSet;
  private readonly cache: WeakMap<ResourceIdentifier, boolean>;

  public constructor(source: ResourceSet) {
    this.source = source;
    this.cache = new WeakMap();
  }

  public async hasResource(identifier: ResourceIdentifier): Promise<boolean> {
    if (this.cache.has(identifier)) {
      return this.cache.get(identifier)!;
    }
    const result = await this.source.hasResource(identifier);
    this.cache.set(identifier, result);
    return result;
  }
}
