import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ensureTrailingSlash, joinUrl } from '../../util/PathUtil';
import { readableToString } from '../../util/StreamUtil';
import type { ResourceStore } from '../ResourceStore';
import type { KeyValueStorage } from './KeyValueStorage';

/**
 * A {@link KeyValueStorage} for JSON-like objects using a {@link ResourceStore} as backend.
 *
 * Creates a base URL by joining the input base URL with the container string.
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
      const identifier = this.createIdentifier(key);
      const representation = await this.source.getRepresentation(identifier, { type: { 'application/json': 1 }});
      return JSON.parse(await readableToString(representation.data));
    } catch (error: unknown) {
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
    }
  }

  public async has(key: string): Promise<boolean> {
    const identifier = this.createIdentifier(key);
    return await this.source.hasResource(identifier);
  }

  public async set(key: string, value: unknown): Promise<this> {
    const identifier = this.createIdentifier(key);
    const representation = new BasicRepresentation(JSON.stringify(value), identifier, 'application/json');
    await this.source.setRepresentation(identifier, representation);
    return this;
  }

  public async delete(key: string): Promise<boolean> {
    try {
      const identifier = this.createIdentifier(key);
      await this.source.deleteResource(identifier);
      return true;
    } catch (error: unknown) {
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      return false;
    }
  }

  public entries(): never {
    // There is no way of knowing which resources were added, or we should keep track in an index file
    throw new NotImplementedHttpError();
  }

  /**
   * Converts a key into an identifier for internal storage.
   */
  private createIdentifier(key: string): ResourceIdentifier {
    return { path: joinUrl(this.container, key) };
  }
}
