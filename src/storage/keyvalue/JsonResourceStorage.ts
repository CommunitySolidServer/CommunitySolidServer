import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { readableToString } from '../../util/StreamUtil';
import type { ResourceStore } from '../ResourceStore';
import type { KeyValueStorage } from './KeyValueStorage';

/**
 * A {@link KeyValueStorage} for strings using a {@link ResourceStore} as backend.
 *
 * Values will be sent as data streams to the given identifiers,
 * so how these are stored depend on the underlying store.
 *
 * All non-404 errors will be re-thrown.
 */
export class JsonResourceStorage implements KeyValueStorage<ResourceIdentifier, unknown> {
  private readonly source: ResourceStore;

  public constructor(source: ResourceStore) {
    this.source = source;
  }

  public async get(identifier: ResourceIdentifier): Promise<unknown | undefined> {
    try {
      const representation = await this.source.getRepresentation(identifier, { type: { 'application/json': 1 }});
      return JSON.parse(await readableToString(representation.data));
    } catch (error: unknown) {
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
    }
  }

  public async has(identifier: ResourceIdentifier): Promise<boolean> {
    try {
      const representation = await this.source.getRepresentation(identifier, { type: { 'application/json': 1 }});
      representation.data.destroy();
      return true;
    } catch (error: unknown) {
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      return false;
    }
  }

  public async set(identifier: ResourceIdentifier, value: unknown): Promise<this> {
    const representation = new BasicRepresentation(JSON.stringify(value), identifier, 'application/json');
    await this.source.setRepresentation(identifier, representation);
    return this;
  }

  public async delete(identifier: ResourceIdentifier): Promise<boolean> {
    try {
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
    // We don't know which resources are in the store
    throw new NotImplementedHttpError();
  }
}
