import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../storage/ResourceStore';
import { APPLICATION_OCTET_STREAM } from '../../util/ContentTypes';
import { readableToString } from '../../util/StreamUtil';

export interface KeyValueInterface {
  get: (resourceIdentifier: ResourceIdentifier) => Promise<unknown | undefined>;
  set: (
    resourceIdentifier: ResourceIdentifier,
    payload: unknown,
    options?: { expires?: Date },
  ) => Promise<void>;
  remove: (identifier: ResourceIdentifier) => Promise<void>;
}

export interface KeyValueInterfaceStorage {
  payload: unknown;
  expires?: string;
}

export function getKeyValueInterfaceFromResourceStore(
  store: ResourceStore,
): KeyValueInterface {
  /**
   * Remove the element from the resourcestore
   * @param identifier - the identifier
   */
  async function remove(identifier: ResourceIdentifier): Promise<void> {
    await store.deleteResource(identifier);
  }

  /**
   * Get the element from the resource store, but not if it's expired
   * @param resourceIdentifier - the identifier
   */
  async function get(
    resourceIdentifier: ResourceIdentifier,
  ): Promise<unknown | undefined> {
    try {
      const representation: Representation = await store.getRepresentation(
        resourceIdentifier,
        {},
      );
      const stored: KeyValueInterfaceStorage = JSON.parse(
        await readableToString(representation.data),
      );
      if (!stored) {
        return;
      }
      if (stored.expires && new Date(stored.expires) < new Date()) {
        await remove(resourceIdentifier);
        return;
      }
      return stored.payload;
    } catch {
      // Do nothing just return undefined
    }
  }

  /**
   * Set some data
   * @param resourceIdentifier - the identifier
   * @param payload - The payload to store
   * @param options - expires: Date
   */
  async function set(
    resourceIdentifier: ResourceIdentifier,
    payload: unknown,
    options?: { expires?: Date },
  ): Promise<void> {
    const toStore: KeyValueInterfaceStorage = { payload };
    if (options?.expires) {
      toStore.expires = options.expires.toString();
    }
    await store.setRepresentation(
      resourceIdentifier,
      new BasicRepresentation(
        JSON.stringify(toStore),
        resourceIdentifier,
        APPLICATION_OCTET_STREAM,
      ),
    );
  }

  return { get, set, remove };
}
