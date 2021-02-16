import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../storage/ResourceStore';
import { APPLICATION_OCTET_STREAM } from '../../util/ContentTypes';
import { readableToString } from '../../util/StreamUtil';
import type { KeyValueStore } from './KeyValueStore';

export interface StoredData {
  payload: unknown;
  expires?: string;
}

/**
 * A KeyValueStore that wraps a provided ResourceStore
 */
export class PassthroughKeyValueStore implements KeyValueStore {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    this.store = store;
  }

  public async get(resourceIdentifier: ResourceIdentifier): Promise<unknown> {
    try {
      const representation: Representation = await this.store.getRepresentation(
        resourceIdentifier,
        {},
      );
      const stored: StoredData = JSON.parse(
        await readableToString(representation.data),
      );
      if (!stored) {
        return;
      }
      if (stored.expires && new Date(stored.expires) < new Date()) {
        await this.remove(resourceIdentifier);
        return;
      }
      return stored.payload;
    } catch {
      // Do nothing just return undefined
    }
  }

  public async set(
    resourceIdentifier: ResourceIdentifier,
    payload: unknown,
    options?: { expires?: Date | undefined } | undefined,
  ): Promise<void> {
    const toStore: StoredData = { payload };
    if (options?.expires) {
      toStore.expires = options.expires.toString();
    }
    await this.store.setRepresentation(
      resourceIdentifier,
      new BasicRepresentation(
        JSON.stringify(toStore),
        resourceIdentifier,
        APPLICATION_OCTET_STREAM,
      ),
    );
  }

  /**
   * Remove the element from the resourcestore
   * @param identifier - the identifier
   */
  public async remove(identifier: ResourceIdentifier): Promise<void> {
    await this.store.deleteResource(identifier);
  }
}
