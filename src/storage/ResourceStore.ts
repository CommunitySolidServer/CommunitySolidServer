import { Conditions } from './Conditions';
import { Patch } from '../ldp/http/Patch';
import { Representation } from '../ldp/http/Representation';
import { RepresentationPreferences } from '../ldp/http/RepresentationPreferences';
import { ResourceIdentifier } from '../ldp/http/ResourceIdentifier';

/**
 * A ResourceStore represents a collection of resources.
 * It has been designed such that each of its methods
 * can be implemented in an atomic way:  for each CRUD operation, only one
 * dedicated method needs to be called. A fifth method enables the optimization
 * of partial updates with PATCH. It is up to the implementer of the interface to
 * (not) make an implementation atomic.
 */
export interface ResourceStore {
  /**
   * Read a resource.
   * @param identifier - Identifier of the resource to read.
   * @param preferences - Representation preferences.
   * @param conditions - Optional conditions.
   *
   * @returns A promise containing the representation.
   */
  getRepresentation: (
    identifier: ResourceIdentifier,
    preferences: RepresentationPreferences,
    conditions?: Conditions,
  ) => Promise<Representation>;

  /**
   * Create a resource.
   * @param container - Container in which to create a resource.
   * @param representation - Representation of the new resource
   * @param conditions - Optional conditions.
   *
   * @returns A promise containing the new identifier.
   */
  addResource: (
    container: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ) => Promise<ResourceIdentifier>;

  /**
   * Fully update a resource.
   * @param identifier - Identifier of resource to update.
   * @param representation - New representation of the resource.
   * @param conditions - Optional conditions.
   *
   * @returns A promise resolving when the update is finished.
   */
  setRepresentation: (
    identifier: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ) => Promise<void>;

  /**
   * Delete a resource.
   * @param identifier - Identifier of resource to delete.
   * @param conditions - Optional conditions.
   *
   * @returns A promise resolving when the delete is finished.
   */
  deleteResource: (identifier: ResourceIdentifier, conditions?: Conditions) => Promise<void>;

  /**
   * Partially update a resource.
   * @param identifier - Identifier of resource to update.
   * @param patch - Description of which parts to update.
   * @param conditions - Optional conditions.
   *
   * @returns A promise resolving when the update is finished.
   */
  modifyResource: (identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions) => Promise<void>;
}
