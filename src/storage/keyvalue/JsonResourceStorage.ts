import { URL } from 'url';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { ensureTrailingSlash } from '../../util/PathUtil';
import { readableToString } from '../../util/StreamUtil';
import { LDP } from '../../util/Vocabularies';
import type { ResourceStore } from '../ResourceStore';
import type { KeyValueStorage } from './KeyValueStorage';

/**
 * A {@link KeyValueStorage} for JSON-like objects using a {@link ResourceStore} as backend.
 *
 * The keys will be transformed so they can be safely used
 * as a resource name in the given container.
 * Values will be sent as data streams,
 * so how these are stored depends on the underlying store.
 *
 * All non-404 errors will be re-thrown.
 */
export class JsonResourceStorage implements KeyValueStorage<string, unknown> {
  private readonly source: ResourceStore;
  private readonly container: string;

  public constructor(source: ResourceStore, baseUrl: string, container: string) {
    this.source = source;
    this.container = ensureTrailingSlash(new URL(container, baseUrl).href);
  }

  public async get(key: string): Promise<unknown | undefined> {
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
    return await this.source.resourceExists(identifier);
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

  public async* entries(): AsyncIterableIterator<[string, unknown]> {
    // Getting ldp:contains metadata from container to find entries
    let container: Representation;
    try {
      container = await this.source.getRepresentation({ path: this.container }, {});
    } catch (error: unknown) {
      // Container might not exist yet, will be created the first time `set` gets called
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      return;
    }

    // Only need the metadata
    container.data.destroy();
    const members = container.metadata.getAll(LDP.terms.contains).map((term): string => term.value);
    for (const member of members) {
      const representation = await this.source.getRepresentation({ path: member }, { type: { 'application/json': 1 }});
      const json = JSON.parse(await readableToString(representation.data));
      yield [ this.parseMember(member), json ];
    }
  }

  /**
   * Converts a key into an identifier for internal storage.
   */
  private createIdentifier(key: string): ResourceIdentifier {
    const buffer = Buffer.from(key);
    return { path: `${this.container}${buffer.toString('base64')}` };
  }

  /**
   * Converts an internal storage identifier string into the original identifier key.
   */
  private parseMember(member: string): string {
    const buffer = Buffer.from(member.slice(this.container.length), 'base64');
    return buffer.toString('utf-8');
  }
}
