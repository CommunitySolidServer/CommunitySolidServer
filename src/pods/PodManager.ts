import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import type { PodSettings } from './settings/PodSettings';

/**
 * Covers all functions related to pod management.
 * In the future this should also include delete, and potentially recovery functions.
 */
export interface PodManager {
  /**
   * Creates a pod for the given settings.
   * @param settings - Settings describing the pod.
   * @returns {@link ResourceIdentifier} of the newly created pod.
   */
  createPod: (settings: PodSettings) => Promise<ResourceIdentifier>;
}
