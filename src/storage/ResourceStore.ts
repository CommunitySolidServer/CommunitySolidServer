import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { Conditions } from './Conditions';

/**
 * A ResourceStore represents a collection of resources.
 * It has been designed such that each of its methods
 * can be implemented in an atomic way:  for each CRUD operation, only one
 * dedicated method needs to be called. A fifth method enables the optimization
 * of partial updates with PATCH. It is up to the implementer of the interface to
 * (not) make an implementation atomic.
 *
 * ResourceStores are also responsible for taking auxiliary resources into account
 * should those be relevant to the store.
 */
export interface ResourceStore {

  /**
   * Check if a resource exists.
   * @param identifier - Identifier of resource to check.
   *
   * @returns A promise resolving if the resource already exists
   */
  resourceExists: (identifier: ResourceIdentifier, conditions?: Conditions) => Promise<boolean>;

  /**
   * Retrieves a representation of a resource.
   * @param identifier - Identifier of the resource to read.
   * @param preferences - Preferences indicating desired representations.
   * @param conditions - Optional conditions under which to proceed.
   *
   * @returns A representation corresponding to the identifier.
   */
  getRepresentation: (
    identifier: ResourceIdentifier,
    preferences: RepresentationPreferences,
    conditions?: Conditions,
  ) => Promise<Representation>;

  /**
   * Sets or replaces the representation of a resource,
   * creating a new resource and intermediary containers as needed.
   * @param identifier - Identifier of resource to update.
   * @param representation - New representation of the resource.
   * @param conditions - Optional conditions under which to proceed.
   *
   * @returns Identifiers of resources that were possibly modified.
   */
  setRepresentation: (
    identifier: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ) => Promise<ResourceIdentifier[]>;

  /**
   * Creates a new resource in the container.
   * @param container - Container in which to create a resource.
   * @param representation - Representation of the new resource
   * @param conditions - Optional conditions under which to proceed.
   *
   * @returns The identifier of the newly created resource.
   */
  addResource: (
    container: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ) => Promise<ResourceIdentifier>;

  /**
   * Deletes a resource.
   * @param identifier - Identifier of resource to delete.
   * @param conditions - Optional conditions under which to proceed.
   *
   * @returns Identifiers of resources that were possibly modified.
   */
  deleteResource: (
    identifier: ResourceIdentifier,
    conditions?: Conditions,
  ) => Promise<ResourceIdentifier[]>;

  /**
   * Sets or updates the representation of a resource,
   * creating a new resource and intermediary containers as needed.
   * @param identifier - Identifier of resource to update.
   * @param patch - Description of which parts to update.
   * @param conditions - Optional conditions under which to proceed.
   *
   * @returns Identifiers of resources that were possibly modified.
   */
  modifyResource: (
    identifier: ResourceIdentifier,
    patch: Patch,
    conditions?: Conditions,
  ) => Promise<ResourceIdentifier[]>;
}
