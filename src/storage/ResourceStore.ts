import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { Conditions } from './Conditions';
import type { ResourceSet } from './ResourceSet';

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
export interface ResourceStore extends ResourceSet {
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
   * @returns An object containing one property for each resource that was created, updated or deleted
   * by this operation. Where the key of the property is the path of the resource (string) and the value is an
   * instance of RepresentationMetadata containing extra information about the change of the resource.
   */
  setRepresentation: (
    identifier: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ) => Promise<Record<string, RepresentationMetadata>>;

  /**
   * Creates a new resource in the container.
   * @param container - Container in which to create a resource.
   * @param representation - Representation of the new resource
   * @param conditions - Optional conditions under which to proceed.
   *
   * @returns An object containing one property for each resource that was created, updated or deleted
   * by this operation. Where the key of the property is the path of the resource (string) and the value is an
   * instance of RepresentationMetadata containing extra information about the change of the resource.
   */
  addResource: (
    container: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ) => Promise<Record<string, RepresentationMetadata>>;

  /**
   * Deletes a resource.
   * @param identifier - Identifier of resource to delete.
   * @param conditions - Optional conditions under which to proceed.
   *
   * @returns An object containing one property for each resource that was created, updated or deleted
   * by this operation. Where the key of the property is the path of the resource (string) and the value is an
   * instance of RepresentationMetadata containing extra information about the change of the resource.
   */
  deleteResource: (
    identifier: ResourceIdentifier,
    conditions?: Conditions,
  ) => Promise<Record<string, RepresentationMetadata>>;

  /**
   * Sets or updates the representation of a resource,
   * creating a new resource and intermediary containers as needed.
   * @param identifier - Identifier of resource to update.
   * @param patch - Description of which parts to update.
   * @param conditions - Optional conditions under which to proceed.
   *
   * @returns An object containing one property for each resource that was created, updated or deleted
   * by this operation. Where the key of the property is the path of the resource (string) and the value is an
   * instance of RepresentationMetadata containing extra information about the change of the resource.
   */
  modifyResource: (
    identifier: ResourceIdentifier,
    patch: Patch,
    conditions?: Conditions,
  ) => Promise<Record<string, RepresentationMetadata>>;
}
