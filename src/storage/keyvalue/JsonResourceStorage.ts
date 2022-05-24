import { createHash } from 'crypto';
import { parse } from 'path';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { ensureLeadingSlash, ensureTrailingSlash, isContainerIdentifier, joinUrl,
  joinFilePath } from '../../util/PathUtil';
import { readableToString } from '../../util/StreamUtil';
import { LDP } from '../../util/Vocabularies';
import type { ResourceStore } from '../ResourceStore';
import type { KeyValueStorage } from './KeyValueStorage';

// Maximum allowed length for the keys, longer keys will be hashed.
const KEY_LENGTH_LIMIT = 255;

/**
 * A {@link KeyValueStorage} for JSON-like objects using a {@link ResourceStore} as backend.
 *
 * Creates a base URL by joining the input base URL with the container string.
 * The storage assumes it has ownership over all entries in the target container
 * so no other classes should access resources there to prevent issues.
 *
 * Assumes the input keys can be safely used to generate identifiers,
 * which will be appended to the stored base URL.
 *
 * All non-404 errors will be re-thrown.
 */
export class JsonResourceStorage<T> implements KeyValueStorage<string, T> {
  private readonly source: ResourceStore;
  private readonly container: string;

  public constructor(source: ResourceStore, baseUrl: string, container: string) {
    this.source = source;
    this.container = ensureTrailingSlash(joinUrl(baseUrl, container));
  }

  public async get(key: string): Promise<T | undefined> {
    try {
      const identifier = this.keyToIdentifier(key);
      const representation = await this.source.getRepresentation(identifier, { type: { 'application/json': 1 }});
      return JSON.parse(await readableToString(representation.data));
    } catch (error: unknown) {
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
    }
  }

  public async has(key: string): Promise<boolean> {
    const identifier = this.keyToIdentifier(key);
    return await this.source.hasResource(identifier);
  }

  public async set(key: string, value: unknown): Promise<this> {
    const identifier = this.keyToIdentifier(key);
    const representation = new BasicRepresentation(JSON.stringify(value), identifier, 'application/json');
    await this.source.setRepresentation(identifier, representation);
    return this;
  }

  public async delete(key: string): Promise<boolean> {
    try {
      const identifier = this.keyToIdentifier(key);
      await this.source.deleteResource(identifier);
      return true;
    } catch (error: unknown) {
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      return false;
    }
  }

  public async* entries(): AsyncIterableIterator<[string, T]> {
    yield* this.getResourceEntries({ path: this.container });
  }

  /**
   * Recursively iterates through the container to find all documents.
   */
  private async* getResourceEntries(identifier: ResourceIdentifier): AsyncIterableIterator<[string, T]> {
    const representation = await this.safelyGetResource(identifier);
    if (representation) {
      if (isContainerIdentifier(identifier)) {
        // Only need the metadata
        representation.data.destroy();
        const members = representation.metadata.getAll(LDP.terms.contains).map((term): string => term.value);
        for (const path of members) {
          yield* this.getResourceEntries({ path });
        }
      } else {
        const json = JSON.parse(await readableToString(representation.data));
        yield [ this.identifierToKey(identifier), json ];
      }
    }
  }

  /**
   * Returns the representation for the given identifier.
   * Returns undefined if a 404 error is thrown.
   * Re-throws the error in all other cases.
   */
  private async safelyGetResource(identifier: ResourceIdentifier): Promise<Representation | undefined> {
    let representation: Representation | undefined;
    try {
      const preferences = isContainerIdentifier(identifier) ? {} : { type: { 'application/json': 1 }};
      representation = await this.source.getRepresentation(identifier, preferences);
    } catch (error: unknown) {
      // Can happen if resource is deleted by this point.
      // When using this for internal data this can specifically happen quite often with locks.
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
    }
    return representation;
  }

  /**
   * Converts a key into an identifier for internal storage.
   */
  private keyToIdentifier(key: string): ResourceIdentifier {
    // Parse the key as a file path
    const parsedPath = parse(key);
    // Hash long filenames to prevent issues with the underlying storage.
    // E.g. a UNIX a file name cannot exceed 255 bytes.
    // This is a temporary fix for https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1013,
    // until we have a solution for data migration.
    if (parsedPath.base.length > KEY_LENGTH_LIMIT) {
      key = joinFilePath(parsedPath.dir, this.applyHash(parsedPath.base));
    }
    return { path: joinUrl(this.container, key) };
  }

  /**
   * Converts an internal identifier to an external key.
   */
  private identifierToKey(identifier: ResourceIdentifier): string {
    // Due to the usage of `joinUrl` we don't know for sure if there was a preceding slash,
    // so we always add one for consistency.
    // In practice this would only be an issue if a class depends
    // on the `entries` results matching a key that was sent before.
    return ensureLeadingSlash(identifier.path.slice(this.container.length));
  }

  private applyHash(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
