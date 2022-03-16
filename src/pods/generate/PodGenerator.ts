import type { ResourceStore } from '../../storage/ResourceStore';
import type { PodSettings } from '../settings/PodSettings';

/**
 * Generates an empty resource store to be used as a new pod.
 * It is also responsible for storing any relevant variables needed to instantiate this resource store.
 * These can then be used when the server is restarted to re-instantiate those stores.
 */
export interface PodGenerator {
  /**
   * Creates a ResourceStore based on the given input.
   * Should error if there already is a store for the given identifier.
   *
   * @param settings - Parameters to be used for the new pod.
   *
   * @returns A new ResourceStore to be used for the new pod.
   */
  generate: (settings: PodSettings) => Promise<ResourceStore>;
}
