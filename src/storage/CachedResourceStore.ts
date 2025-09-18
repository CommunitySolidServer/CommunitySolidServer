import { getLoggerFor } from 'global-logger-factory';
import { LRUCache } from 'lru-cache';
import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { SingleThreaded } from '../init/cluster/SingleThreaded';
import type {
  CachedRepresentation,
} from '../util/CacheUtil';
import {
  cachedToRepresentation,

  calculateCachedRepresentationSize,
  duplicateRepresentation,
  representationToCached,
} from '../util/CacheUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import type { Conditions } from './conditions/Conditions';
import { PassthroughStore } from './PassthroughStore';
import type { ChangeMap, ResourceStore } from './ResourceStore';

export interface CachedResourceStoreArgs {
  source: ResourceStore;
  metadataStrategy: AuxiliaryIdentifierStrategy;
  cacheSettings?: { max?: number; maxSize?: number };
}

export interface CacheEntry {
  identifier: ResourceIdentifier;
  representation: Representation;
}

/**
 * A {@link ResourceStore} that caches representation responses.
 * Caching is done using the identifier as key, so this should be at the end of the store chain,
 * after content negotiation, as that results in different representations for the same identifier.
 *
 * Cache entries are invalidated after any successful write operation.
 * Because of this, this store does not work with worker threads,
 * as the thread invalidating the cache might not be the one that has that cache entry.
 *
 * Cache settings can be set to determine the max cache entries, or the max size for the entire cache (in bytes).
 * `maxSize` only works for binary data streams.
 */
export class CachedResourceStore extends PassthroughStore implements SingleThreaded {
  protected readonly logger = getLoggerFor(this);

  protected readonly metadataStrategy: AuxiliaryIdentifierStrategy;
  protected readonly cache: LRUCache<string, CachedRepresentation>;

  // Allows canceling caching if the resource was invalidated before caching was finished
  protected readonly cacheProgress: Record<string, CacheEntry> = {};

  public constructor(args: CachedResourceStoreArgs) {
    super(args.source);
    this.metadataStrategy = args.metadataStrategy;
    const max = args.cacheSettings?.max ?? 1000;
    // 100 MB
    const maxSize = args.cacheSettings?.maxSize ?? 100_000_000;

    this.cache = new LRUCache({ max, maxSize, sizeCalculation: calculateCachedRepresentationSize });
  }

  public async hasResource(identifier: ResourceIdentifier): Promise<boolean> {
    if (this.cache.has(identifier.path) || this.cacheProgress[identifier.path]) {
      return true;
    }
    return super.hasResource(identifier);
  }

  public async getRepresentation(
    identifier: ResourceIdentifier,
    preferences: RepresentationPreferences,
    conditions?: Conditions,
  ): Promise<Representation> {
    this.logger.debug(`Checking cache with key ${identifier.path}`);

    const cached = this.cache.get(identifier.path);
    if (cached) {
      this.logger.debug(`Cache hit with key ${identifier.path}`);
      return cachedToRepresentation(cached);
    }

    const representation = await super.getRepresentation(identifier, preferences, conditions);
    return this.cacheRepresentation(identifier, representation);
  }

  public async addResource(
    container: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    const changes = await super.addResource(container, representation, conditions);
    this.invalidateCache(changes);
    return changes;
  }

  public async setRepresentation(
    identifier: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    const changes = await super.setRepresentation(identifier, representation, conditions);
    this.invalidateCache(changes);
    return changes;
  }

  public async modifyResource(
    identifier: ResourceIdentifier,
    patch: Patch,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    const changes = await super.modifyResource(identifier, patch, conditions);
    this.invalidateCache(changes);
    return changes;
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<ChangeMap> {
    const changes = await super.deleteResource(identifier, conditions);
    this.invalidateCache(changes);
    return changes;
  }

  /**
   * Cache the given representation for the given identifier.
   * Returns a representation that can be used instead of the one given as input,
   * as that one will be read during the caching.
   * Caching will be done async, to prevent blocking the result while caching is in progress.
   * If caching is already in progress for the identifier,
   * no new caching process will be started.
   */
  protected cacheRepresentation(identifier: ResourceIdentifier, representation: Representation): Representation {
    if (this.cacheProgress[identifier.path]) {
      return representation;
    }

    const [ copy1, copy2 ] = duplicateRepresentation(representation);

    this.cacheProgress[identifier.path] = { identifier, representation: copy1 };

    // Don't await so caching doesn't block returning a result
    representationToCached(copy1).then((newCached): void => {
      // Progress entry being removed implies that the result was invalidated in the meantime
      if (newCached && this.cacheProgress[identifier.path]?.identifier === identifier) {
        this.cache.set(identifier.path, newCached);
        delete this.cacheProgress[identifier.path];
      }
    }).catch((error: unknown): void => {
      this.logger.warn(`Unable to cache ${identifier.path}: ${createErrorMessage(error)}`);
    });

    return copy2;
  }

  /**
   * Invalidates the cache for all identifiers in the {@link ChangeMap}.
   * Also invalidates the corresponding metadata resource,
   * or the corresponding subject resource in the case the identifier is a metadata resource,
   * since the CSS backend does not return those in the response (yet).
   */
  protected invalidateCache(changeMap: ChangeMap): void {
    for (const identifier of changeMap.keys()) {
      this.invalidateIdentifier(identifier);
      if (this.metadataStrategy.isAuxiliaryIdentifier(identifier)) {
        this.invalidateIdentifier(this.metadataStrategy.getSubjectIdentifier(identifier));
      } else {
        this.invalidateIdentifier(this.metadataStrategy.getAuxiliaryIdentifier(identifier));
      }
    }
  }

  /**
   * Invalidate caching of the given identifier.
   * This will also terminate any incomplete caching for that identifier.
   */
  protected invalidateIdentifier(identifier: ResourceIdentifier): void {
    this.cache.delete(identifier.path);
    if (this.cacheProgress[identifier.path]) {
      this.cacheProgress[identifier.path].representation.data.destroy();
      delete this.cacheProgress[identifier.path];
    }
  }
}
