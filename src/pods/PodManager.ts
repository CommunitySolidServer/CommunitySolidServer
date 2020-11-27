import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import type { Agent } from './agent/Agent';

/**
 * Covers all functions related to pod management.
 * In the future this should also include delete, and potentially recovery functions.
 */
export interface PodManager {
  /**
   * Creates a pod for the given agent data.
   * @param agent - Data of the agent that needs a pod.
   * @returns {@link ResourceIdentifier} of the newly created pod.
   */
  createPod: (agent: Agent) => Promise<ResourceIdentifier>;
}
