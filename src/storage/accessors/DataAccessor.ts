import type { Readable } from 'stream';
import type { Representation } from '../../ldp/representation/Representation';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';

/**
 * A DataAccessor is the building block closest to the actual data storage.
 * It should not worry about most Solid logic, most of that will be handled before it is called.
 * There are a few things it still needs to do, and it is very important every implementation does this:
 *  * If the input identifier ends with a slash, it should be assumed the identifier is targeting a container.
 *  * Similarly, if there is no trailing slash it should assume a document.
 *  * It should always throw a NotFoundHttpError if it does not have data matching the input identifier.
 *  * DataAccessors are responsible for generating the relevant containment triples for containers.
 */
export interface DataAccessor {
  /**
   * Should throw a NotImplementedHttpError if the DataAccessor does not support storing the given Representation.
   * @param representation - Incoming Representation.
   *
   * @throws BadRequestHttpError
   * If it does not support the incoming data.
   */
  canHandle: (representation: Representation) => Promise<void>;

  /**
   * Returns a data stream stored for the given identifier.
   * It can be assumed that the incoming identifier will always correspond to a document.
   * @param identifier - Identifier for which the data is requested.
   */
  getData: (identifier: ResourceIdentifier) => Promise<Guarded<Readable>>;

  /**
   * Returns the metadata corresponding to the identifier.
   * @param identifier - Identifier for which the metadata is requested.
   */
  getMetadata: (identifier: ResourceIdentifier) => Promise<RepresentationMetadata>;

  /**
   * Writes data and metadata for a document.
   * If any data and/or metadata exist for the given identifier, it should be overwritten.
   * @param identifier - Identifier of the resource.
   * @param data - Data to store.
   * @param metadata - Metadata to store.
   */
  writeDocument: (identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata) =>
  Promise<void>;

  /**
   * Writes metadata for a container.
   * If the container does not exist yet it should be created,
   * if it does its metadata should be overwritten, except for the containment triples.
   * @param identifier - Identifier of the container.
   * @param metadata - Metadata to store.
   */
  writeContainer: (identifier: ResourceIdentifier, metadata: RepresentationMetadata) => Promise<void>;

  /**
   * Deletes the resource and its corresponding metadata.
   *
   * Solid, §5.4: "When a contained resource is deleted, the server MUST also remove the corresponding containment
   * triple, which has the effect of removing the deleted resource from the containing container."
   * https://solid.github.io/specification/protocol#deleting-resources
   *
   * @param identifier - Resource to delete.
   */
  deleteResource: (identifier: ResourceIdentifier) => Promise<void>;
}
