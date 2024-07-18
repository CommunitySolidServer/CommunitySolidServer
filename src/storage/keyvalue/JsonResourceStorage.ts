import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { ensureTrailingSlash, isContainerIdentifier, joinUrl, trimLeadingSlashes } from '../../util/PathUtil';
import { readableToString } from '../../util/StreamUtil';
import { LDP } from '../../util/Vocabularies';
import type { ResourceStore } from '../ResourceStore';
import type { KeyValueStorage } from './KeyValueStorage';

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
  protected readonly logger = getLoggerFor(this);

  protected readonly source: ResourceStore;
  protected readonly container: string;

  public constructor(source: ResourceStore, baseUrl: string, container: string) {
    this.source = source;
    this.container = ensureTrailingSlash(joinUrl(baseUrl, container));
  }

  public async get(key: string): Promise<T | undefined> {
    try {
      const identifier = this.keyToIdentifier(key);
      // eslint-disable-next-line ts/naming-convention
      const representation = await this.source.getRepresentation(identifier, { type: { 'application/json': 1 }});
      // eslint-disable-next-line ts/no-unsafe-return
      return JSON.parse(await readableToString(representation.data));
    } catch (error: unknown) {
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
    }
  }

  public async has(key: string): Promise<boolean> {
    const identifier = this.keyToIdentifier(key);
    return this.source.hasResource(identifier);
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
  protected async* getResourceEntries(identifier: ResourceIdentifier): AsyncIterableIterator<[string, T]> {
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
        try {
          const json = JSON.parse(await readableToString(representation.data)) as T;
          yield [ this.identifierToKey(identifier), json ];
        } catch (error: unknown) {
          this.logger.error(`Unable to parse ${identifier.path
          }. You should probably delete this resource manually. Error: ${
            createErrorMessage(error)}`);
        }
      }
    }
  }

  /**
   * Returns the representation for the given identifier.
   * Returns undefined if a 404 error is thrown.
   * Re-throws the error in all other cases.
   */
  protected async safelyGetResource(identifier: ResourceIdentifier): Promise<Representation | undefined> {
    let representation: Representation | undefined;
    try {
      // eslint-disable-next-line ts/naming-convention
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
  protected keyToIdentifier(key: string): ResourceIdentifier {
    return { path: joinUrl(this.container, key) };
  }

  /**
   * Converts an internal identifier to an external key.
   */
  protected identifierToKey(identifier: ResourceIdentifier): string {
    // Due to the usage of `joinUrl` we don't know for sure if there was a preceding slash,
    // so we always remove leading slashes one for consistency.
    // In practice this only has an impact on the `entries` call
    // and only if class calling this depends on a leading slash still being there.
    return trimLeadingSlashes(identifier.path.slice(this.container.length));
  }
}
