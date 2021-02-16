import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';

/**
 * A simple key value interface that's used in non-LDP related
 * storage classes
 */
export interface KeyValueStore {
  get: (resourceIdentifier: ResourceIdentifier) => Promise<unknown | undefined>;
  set: (
    resourceIdentifier: ResourceIdentifier,
    payload: unknown,
    options?: { expires?: Date },
  ) => Promise<void>;
  remove: (identifier: ResourceIdentifier) => Promise<void>;
}
