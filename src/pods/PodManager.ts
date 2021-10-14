import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { PodSettings } from './settings/PodSettings';

/**
 * Covers all functions related to pod management.
 * In the future this should also include delete, and potentially recovery functions.
 */
export interface PodManager {
  /**
   * Creates a pod for the given settings.
   * @param identifier - Root identifier indicating where the pod should be created.
   * @param settings - Settings describing the pod.
   * @param overwrite - If the creation should proceed if there already is a resource there.
   */
  createPod: (identifier: ResourceIdentifier, settings: PodSettings, overwrite: boolean) => Promise<void>;
}
