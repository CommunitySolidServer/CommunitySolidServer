import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';

export interface KeyValueStore {
  get: (resourceIdentifier: ResourceIdentifier) => Promise<unknown | undefined>;
  set: (
    resourceIdentifier: ResourceIdentifier,
    payload: unknown,
    options?: { expires?: Date },
  ) => Promise<void>;
  remove: (identifier: ResourceIdentifier) => Promise<void>;
}
