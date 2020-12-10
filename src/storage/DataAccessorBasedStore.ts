import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import { v4 as uuid } from 'uuid';
import type { Representation } from '../ldp/representation/Representation';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { MethodNotAllowedHttpError } from '../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import {
  ensureTrailingSlash,
  getParentContainer,
  isContainerIdentifier,
  isContainerPath,
  trimTrailingSlashes,
} from '../util/PathUtil';
import { parseQuads } from '../util/QuadUtil';
import { generateResourceQuads } from '../util/ResourceUtil';
import { guardedStreamFrom } from '../util/StreamUtil';
import { CONTENT_TYPE, HTTP, LDP, RDF } from '../util/UriConstants';
import type { DataAccessor } from './accessors/DataAccessor';
import type { ResourceStore } from './ResourceStore';

/**
 * ResourceStore which uses a DataAccessor for backend access.
 *
 * The DataAccessor interface provides elementary store operations such as read and write.
 * This DataAccessorBasedStore uses those elementary store operations
 * to implement the more high-level ResourceStore contact, abstracting all common functionality
 * such that new stores can be added by implementing the more simple DataAccessor contract.
 * DataAccessorBasedStore thereby provides behaviours for reuse across different stores, such as:
 *  * Converting container metadata to data
 *  * Converting slug to URI
 *  * Checking if addResource target is a container
 *  * Checking if no containment triples are written to a container
 *  * etc.
 *
 * Currently "metadata" is seen as something that is not directly accessible.
 * That means that a consumer can't write directly to the metadata of a resource, only indirectly through headers.
 * (Except for containers where data and metadata overlap).
 *
 * The one thing this store does not take care of (yet?) are containment triples for containers
 *
 * Work has been done to minimize the number of required calls to the DataAccessor,
 * but the main disadvantage is that sometimes multiple calls are required where a specific store might only need one.
 */
export class DataAccessorBasedStore implements ResourceStore {
  private readonly accessor: DataAccessor;
  private readonly base: string;

  public constructor(accessor: DataAccessor, base: string) {
    this.accessor = accessor;
    this.base = ensureTrailingSlash(base);
  }

  public async getRepresentation(identifier: ResourceIdentifier): Promise<Representation> {
    this.validateIdentifier(identifier);

    // In the future we want to use getNormalizedMetadata and redirect in case the identifier differs
    const metadata = await this.accessor.getMetadata(identifier);

    let result: Representation;

    // Create the representation of a container
    if (this.isExistingContainer(metadata)) {
      // Generate the data stream before setting the content-type to prevent unnecessary triples
      const data = guardedStreamFrom(metadata.quads());
      metadata.contentType = INTERNAL_QUADS;
      result = {
        binary: false,
        data,
        metadata,
      };

    // Obtain a representation of a document
    } else {
      result = {
        binary: metadata.contentType !== INTERNAL_QUADS,
        data: await this.accessor.getData(identifier),
        metadata,
      };
    }
    return result;
  }

  public async addResource(container: ResourceIdentifier, representation: Representation): Promise<ResourceIdentifier> {
    this.validateIdentifier(container);

    // Ensure the representation is supported by the accessor
    await this.accessor.canHandle(representation);

    // Using the parent metadata as we can also use that later to check if the nested containers maybe need to be made
    const parentMetadata = await this.getSafeNormalizedMetadata(container);

    // When a POST method request targets a non-container resource without an existing representation,
    // the server MUST respond with the 404 status code.
    if (!parentMetadata && !isContainerIdentifier(container)) {
      throw new NotFoundHttpError();
    }

    if (parentMetadata && !this.isExistingContainer(parentMetadata)) {
      throw new MethodNotAllowedHttpError('The given path is not a container.');
    }

    const newID = this.createSafeUri(container, representation.metadata, parentMetadata);

    // Write the data. New containers will need to be created if there is no parent.
    await this.writeData(newID, representation, isContainerIdentifier(newID), !parentMetadata);

    return newID;
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    this.validateIdentifier(identifier);

    // Ensure the representation is supported by the accessor
    await this.accessor.canHandle(representation);

    // Check if the resource already exists
    const oldMetadata = await this.getSafeNormalizedMetadata(identifier);

    // Might want to redirect in the future
    if (oldMetadata && oldMetadata.identifier.value !== identifier.path) {
      throw new ConflictHttpError(`${identifier.path} conflicts with existing path ${oldMetadata.identifier.value}`);
    }

    // If we already have a resource for the given identifier, make sure they match resource types
    const isContainer = this.isNewContainer(representation.metadata, identifier.path);
    if (oldMetadata && isContainer !== this.isExistingContainer(oldMetadata)) {
      throw new ConflictHttpError('Input resource type does not match existing resource type.');
    }
    if (isContainer !== isContainerIdentifier(identifier)) {
      throw new BadRequestHttpError('Containers should have a `/` at the end of their path, resources should not.');
    }

    // Potentially have to create containers if it didn't exist yet
    await this.writeData(identifier, representation, isContainer, !oldMetadata);
  }

  public async modifyResource(): Promise<void> {
    throw new NotImplementedHttpError('Patches are not supported by the default store.');
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    this.validateIdentifier(identifier);
    if (ensureTrailingSlash(identifier.path) === this.base) {
      throw new MethodNotAllowedHttpError('Cannot delete root container.');
    }
    const metadata = await this.accessor.getMetadata(identifier);
    if (metadata.getAll(LDP.contains).length > 0) {
      throw new ConflictHttpError('Can only delete empty containers.');
    }
    return this.accessor.deleteResource(identifier);
  }

  /**
   * Verify if the given identifier matches the stored base.
   */
  protected validateIdentifier(identifier: ResourceIdentifier): void {
    if (!identifier.path.startsWith(this.base)) {
      throw new NotFoundHttpError();
    }
  }

  /**
   * Returns the metadata matching the identifier, ignoring the presence of a trailing slash or not.
   * This is used to support the following part of the spec:
   * "If two URIs differ only in the trailing slash, and the server has associated a resource with one of them,
   *  then the other URI MUST NOT correspond to another resource."
   *
   * First the identifier gets requested and if no result is found
   * the identifier with differing trailing slash is requested.
   * @param identifier - Identifier that needs to be checked.
   */
  protected async getNormalizedMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    const hasSlash = isContainerIdentifier(identifier);
    try {
      return await this.accessor.getMetadata(identifier);
    } catch (error: unknown) {
      if (error instanceof NotFoundHttpError) {
        return this.accessor.getMetadata(
          { path: hasSlash ? trimTrailingSlashes(identifier.path) : ensureTrailingSlash(identifier.path) },
        );
      }
      throw error;
    }
  }

  /**
   * Returns the result of `getNormalizedMetadata` or undefined if a 404 error is thrown.
   */
  protected async getSafeNormalizedMetadata(identifier: ResourceIdentifier):
  Promise<RepresentationMetadata | undefined> {
    try {
      return await this.getNormalizedMetadata(identifier);
    } catch (error: unknown) {
      if (!(error instanceof NotFoundHttpError)) {
        throw error;
      }
    }
  }

  /**
   * Write the given resource to the DataAccessor. Metadata will be updated with necessary triples.
   * In case of containers `handleContainerData` will be used to verify the data.
   * @param identifier - Identifier of the resource.
   * @param representation - Corresponding Representation.
   * @param isContainer - Is the incoming resource a container?
   * @param createContainers - Should parent containers (potentially) be created?
   */
  protected async writeData(identifier: ResourceIdentifier, representation: Representation, isContainer: boolean,
    createContainers?: boolean): Promise<void> {
    if (isContainer) {
      await this.handleContainerData(representation);
    }

    if (createContainers) {
      await this.createRecursiveContainers(getParentContainer(identifier));
    }

    // Make sure the metadata has the correct identifier and correct type quads
    const { metadata } = representation;
    metadata.identifier = DataFactory.namedNode(identifier.path);
    metadata.addQuads(generateResourceQuads(metadata.identifier, isContainer));

    await (isContainer ?
      this.accessor.writeContainer(identifier, representation.metadata) :
      this.accessor.writeDocument(identifier, representation.data, representation.metadata));
  }

  /**
   * Verify if the incoming data for a container is valid (RDF and no containment triples).
   * Adds the container data to its metadata afterwards.
   *
   * @param representation - Container representation.
   */
  protected async handleContainerData(representation: Representation): Promise<void> {
    let quads: Quad[];
    try {
      // No need to parse the data if it already contains internal/quads
      if (representation.metadata.contentType === INTERNAL_QUADS) {
        quads = await arrayifyStream(representation.data);
      } else {
        quads = await parseQuads(representation.data);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestHttpError(`Can only create containers with RDF data. ${error.message}`);
      }
      throw error;
    }

    // Make sure there are no containment triples in the body
    for (const quad of quads) {
      if (quad.predicate.value === LDP.contains) {
        throw new ConflictHttpError('Container bodies are not allowed to have containment triples.');
      }
    }

    // Input content type doesn't matter anymore
    representation.metadata.removeAll(CONTENT_TYPE);

    // Container data is stored in the metadata
    representation.metadata.addQuads(quads);
  }

  /**
   * Generates a new URI for a resource in the given container, potentially using the given slug.
   * @param container - Parent container of the new URI.
   * @param isContainer - Does the new URI represent a container?
   * @param slug - Slug to use for the new URI.
   */
  protected createURI(container: ResourceIdentifier, isContainer: boolean, slug?: string): ResourceIdentifier {
    return { path:
        `${ensureTrailingSlash(container.path)}${slug ? trimTrailingSlashes(slug) : uuid()}${isContainer ? '/' : ''}` };
  }

  /**
   * Generate a valid URI to store a new Resource in the given container.
   * URI will be based on the slug header if there is one and is guaranteed to not exist yet.
   *
   * @param container - Identifier of the target container.
   * @param metadata - Metadata of the new resource.
   * @param parentMetadata - Optional metadata of the parent container.
   */
  protected createSafeUri(container: ResourceIdentifier, metadata: RepresentationMetadata,
    parentMetadata?: RepresentationMetadata): ResourceIdentifier {
    // Get all values needed for naming the resource
    const isContainer = this.isNewContainer(metadata);
    const slug = metadata.get(HTTP.slug)?.value;
    metadata.removeAll(HTTP.slug);

    let newID: ResourceIdentifier = this.createURI(container, isContainer, slug);

    // Make sure we don't already have a resource with this exact name (or with differing trailing slash)
    if (parentMetadata) {
      const withSlash = ensureTrailingSlash(newID.path);
      const withoutSlash = trimTrailingSlashes(newID.path);
      const exists = parentMetadata.getAll(LDP.contains).some((term): boolean =>
        term.value === withSlash || term.value === withoutSlash);
      if (exists) {
        newID = this.createURI(container, isContainer);
      }
    }

    return newID;
  }

  /**
   * Checks if the given metadata represents a (potential) container,
   * both based on the metadata and the URI.
   * @param metadata - Metadata of the (new) resource.
   * @param suffix - Suffix of the URI. Can be the full URI, but only the last part is required.
   */
  protected isNewContainer(metadata: RepresentationMetadata, suffix?: string): boolean {
    let isContainer: boolean;
    try {
      isContainer = this.isExistingContainer(metadata);
    } catch {
      const slug = suffix ?? metadata.get(HTTP.slug)?.value;
      isContainer = Boolean(slug && isContainerPath(slug));
    }
    return isContainer;
  }

  /**
   * Checks if the given metadata represents a container, purely based on metadata type triples.
   * Since type metadata always gets generated when writing resources this should never fail on stored resources.
   * @param metadata - Metadata to check.
   */
  protected isExistingContainer(metadata: RepresentationMetadata): boolean {
    const types = metadata.getAll(RDF.type);
    if (types.length === 0) {
      throw new Error('Unknown resource type.');
    }
    return types.some((type): boolean => type.value === LDP.Container || type.value === LDP.BasicContainer);
  }

  /**
   * Create containers starting from the root until the given identifier corresponds to an existing container.
   * Will throw errors if the identifier of the last existing "container" corresponds to an existing document.
   * @param container - Identifier of the container which will need to exist.
   */
  protected async createRecursiveContainers(container: ResourceIdentifier): Promise<void> {
    try {
      const metadata = await this.getNormalizedMetadata(container);
      if (!this.isExistingContainer(metadata)) {
        throw new ConflictHttpError(`Creating container ${container.path} conflicts with an existing resource.`);
      }
    } catch (error: unknown) {
      if (error instanceof NotFoundHttpError) {
        // Make sure the parent exists first
        await this.createRecursiveContainers(getParentContainer(container));
        await this.writeData(container, this.getEmptyContainerRepresentation(container), true);
      } else {
        throw error;
      }
    }
  }

  /**
   * Generates the minimal representation for an empty container.
   * @param container - Identifier of this new container.
   */
  protected getEmptyContainerRepresentation(container: ResourceIdentifier): Representation {
    return {
      binary: true,
      data: guardedStreamFrom([]),
      metadata: new RepresentationMetadata(container),
    };
  }
}
