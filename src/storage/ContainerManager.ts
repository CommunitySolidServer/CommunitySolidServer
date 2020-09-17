import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';

/**
 * Handles the identification of containers in which a resource is contained.
 */
export interface ContainerManager {
  /**
   * Finds the corresponding container.
   * Should throw an error if there is no such container (in the case of root).
   *
   * @param id - Identifier to find container of.
   *
   * @returns The identifier of the container this resource is in.
   */
  getContainer: (id: ResourceIdentifier) => Promise<ResourceIdentifier>;
}
