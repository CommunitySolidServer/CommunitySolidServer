import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import type { NamedNode, Quad, Term } from 'rdf-js';
import { v4 as uuid } from 'uuid';
import type { AuxiliaryStrategy } from '../ldp/auxiliary/AuxiliaryStrategy';
import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { isNativeError } from '../util/errors/ErrorUtil';
import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import { MethodNotAllowedHttpError } from '../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import {
  ensureTrailingSlash,
  isContainerIdentifier,
  isContainerPath,
  trimTrailingSlashes,
  toCanonicalUriPath,
} from '../util/PathUtil';
import { parseQuads } from '../util/QuadUtil';
import { generateResourceQuads } from '../util/ResourceUtil';
import { CONTENT_TYPE, DC, HTTP, LDP, POSIX, PIM, RDF, VANN, XSD } from '../util/Vocabularies';
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
  protected readonly logger = getLoggerFor(this);

  private readonly accessor: DataAccessor;
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly auxiliaryStrategy: AuxiliaryStrategy;

  public constructor(accessor: DataAccessor, identifierStrategy: IdentifierStrategy,
    auxiliaryStrategy: AuxiliaryStrategy) {
    this.accessor = accessor;
    this.identifierStrategy = identifierStrategy;
    this.auxiliaryStrategy = auxiliaryStrategy;
  }

  public async getRepresentation(identifier: ResourceIdentifier): Promise<Representation> {
    this.validateIdentifier(identifier);

    // In the future we want to use getNormalizedMetadata and redirect in case the identifier differs
    const metadata = await this.accessor.getMetadata(identifier);
    let representation: Representation;

    // Potentially add auxiliary related metadata
    // Solid, §4.3: "Clients can discover auxiliary resources associated with a subject resource by making an HTTP HEAD
    // or GET request on the target URL, and checking the HTTP Link header with the rel parameter"
    // https://solid.github.io/specification/protocol#auxiliary-resources
    await this.auxiliaryStrategy.addMetadata(metadata);

    if (isContainerPath(metadata.identifier.value)) {
      // Remove containment references of auxiliary resources
      const auxContains = this.getContainedAuxiliaryResources(metadata);
      metadata.remove(LDP.terms.contains, auxContains);

      // Generate a container representation from the metadata
      const data = metadata.quads();
      metadata.addQuad(DC.terms.namespace, VANN.terms.preferredNamespacePrefix, 'dc');
      metadata.addQuad(LDP.terms.namespace, VANN.terms.preferredNamespacePrefix, 'ldp');
      metadata.addQuad(POSIX.terms.namespace, VANN.terms.preferredNamespacePrefix, 'posix');
      metadata.addQuad(XSD.terms.namespace, VANN.terms.preferredNamespacePrefix, 'xsd');
      representation = new BasicRepresentation(data, metadata, INTERNAL_QUADS);
    } else {
      // Retrieve a document representation from the accessor
      representation = new BasicRepresentation(await this.accessor.getData(identifier), metadata);
    }
    return representation;
  }

  public async addResource(container: ResourceIdentifier, representation: Representation): Promise<ResourceIdentifier> {
    this.validateIdentifier(container);

    // Ensure the representation is supported by the accessor
    await this.accessor.canHandle(representation);

    const parentMetadata = await this.getSafeNormalizedMetadata(container);

    // Solid, §5.3: "When a POST method request targets a resource without an existing representation,
    // the server MUST respond with the 404 status code."
    // https://solid.github.io/specification/protocol#writing-resources
    if (!parentMetadata) {
      throw new NotFoundHttpError();
    }

    // Not using `container` since `getSafeNormalizedMetadata` might return metadata for a different identifier.
    // Solid, §5: "Servers MUST respond with the 405 status code to requests using HTTP methods
    // that are not supported by the target resource."
    // https://solid.github.io/specification/protocol#reading-writing-resources
    if (parentMetadata && !isContainerPath(parentMetadata.identifier.value)) {
      throw new MethodNotAllowedHttpError('The given path is not a container.');
    }

    // Solid, §5.1: "Servers MAY allow clients to suggest the URI of a resource created through POST,
    // using the HTTP Slug header as defined in [RFC5023].
    // Clients who want the server to assign a URI of a resource, MUST use the POST request."
    // https://solid.github.io/specification/protocol#resource-type-heuristics
    const newID = this.createSafeUri(container, representation.metadata, parentMetadata);

    // Write the data. New containers should never be made for a POST request.
    await this.writeData(newID, representation, isContainerIdentifier(newID), false);

    return newID;
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    this.validateIdentifier(identifier);

    // Ensure the representation is supported by the accessor
    await this.accessor.canHandle(representation);

    // Check if the resource already exists
    const oldMetadata = await this.getSafeNormalizedMetadata(identifier);

    // Might want to redirect in the future.
    // See #480
    // Solid, §3.1: "If two URIs differ only in the trailing slash, and the server has associated a resource with
    // one of them, then the other URI MUST NOT correspond to another resource. Instead, the server MAY respond to
    // requests for the latter URI with a 301 redirect to the former."
    // https://solid.github.io/specification/protocol#uri-slash-semantics
    if (oldMetadata && oldMetadata.identifier.value !== identifier.path) {
      throw new ForbiddenHttpError(`${identifier.path} conflicts with existing path ${oldMetadata.identifier.value}`);
    }

    const isContainer = this.isNewContainer(representation.metadata, identifier.path);
    // Solid, §3.1: "Paths ending with a slash denote a container resource."
    // https://solid.github.io/specification/protocol#uri-slash-semantics
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
    const metadata = await this.accessor.getMetadata(identifier);
    // Solid, §5.4: "When a DELETE request targets storage’s root container or its associated ACL resource,
    // the server MUST respond with the 405 status code."
    // https://solid.github.io/specification/protocol#deleting-resources
    if (this.isRootStorage(metadata)) {
      throw new MethodNotAllowedHttpError('Cannot delete a root storage container.');
    }
    if (this.auxiliaryStrategy.isAuxiliaryIdentifier(identifier) && this.auxiliaryStrategy.isRootRequired(identifier)) {
      const associatedIdentifier = this.auxiliaryStrategy.getAssociatedIdentifier(identifier);
      const parentMetadata = await this.accessor.getMetadata(associatedIdentifier);
      if (this.isRootStorage(parentMetadata)) {
        throw new MethodNotAllowedHttpError(`Cannot delete ${identifier.path} from a root storage container.`);
      }
    }

    // Solid, §5.4: "When a DELETE request is made to a container, the server MUST delete the container
    // if it contains no resources. If the container contains resources,
    // the server MUST respond with the 409 status code and response body describing the error."
    // https://solid.github.io/specification/protocol#deleting-resources
    if (isContainerIdentifier(identifier)) {
      // Auxiliary resources are not counted when deleting a container since they will also be deleted
      const auxContains = this.getContainedAuxiliaryResources(metadata);
      if (metadata.getAll(LDP.contains).length > auxContains.length) {
        throw new ConflictHttpError('Can only delete empty containers.');
      }
    }
    // Solid, §5.4: "When a contained resource is deleted, the server MUST also delete the associated auxiliary
    // resources"
    // https://solid.github.io/specification/protocol#deleting-resources
    if (!this.auxiliaryStrategy.isAuxiliaryIdentifier(identifier)) {
      await this.safelyDeleteAuxiliaryResources(this.auxiliaryStrategy.getAuxiliaryIdentifiers(identifier));
    }

    return this.accessor.deleteResource(identifier);
  }

  /**
   * Verify if the given identifier matches the stored base.
   */
  protected validateIdentifier(identifier: ResourceIdentifier): void {
    if (!this.identifierStrategy.supportsIdentifier(identifier)) {
      throw new NotFoundHttpError();
    }
  }

  /**
   * Returns the metadata matching the identifier, ignoring the presence of a trailing slash or not.
   *
   * Solid, §3.1: "If two URIs differ only in the trailing slash,
   * and the server has associated a resource with one of them,
   * then the other URI MUST NOT correspond to another resource."
   * https://solid.github.io/specification/protocol#uri-slash-semantics
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
      if (NotFoundHttpError.isInstance(error)) {
        const otherIdentifier =
          { path: hasSlash ? trimTrailingSlashes(identifier.path) : ensureTrailingSlash(identifier.path) };

        // Only try to access other identifier if it is valid in the scope of the DataAccessor
        this.validateIdentifier(otherIdentifier);
        return this.accessor.getMetadata(otherIdentifier);
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
      if (!NotFoundHttpError.isInstance(error)) {
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
    // Make sure the metadata has the correct identifier and correct type quads
    // Need to do this before handling container data to have the correct identifier
    const { metadata } = representation;
    metadata.identifier = DataFactory.namedNode(identifier.path);
    metadata.addQuads(generateResourceQuads(metadata.identifier, isContainer));

    // Validate container data
    if (isContainer) {
      await this.handleContainerData(representation);
    }

    // Validate auxiliary data
    if (this.auxiliaryStrategy.isAuxiliaryIdentifier(identifier)) {
      await this.auxiliaryStrategy.validate(representation);
    }

    // Root container should not have a parent container
    // Solid, §5.3: "Servers MUST create intermediate containers and include corresponding containment triples
    // in container representations derived from the URI path component of PUT and PATCH requests."
    // https://solid.github.io/specification/protocol#writing-resources
    if (createContainers && !this.identifierStrategy.isRootContainer(identifier)) {
      await this.createRecursiveContainers(this.identifierStrategy.getParentContainer(identifier));
    }

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
        const { contentType, identifier } = representation.metadata;
        quads = await parseQuads(representation.data, { format: contentType, baseIRI: identifier.value });
      }
    } catch (error: unknown) {
      if (isNativeError(error)) {
        throw new BadRequestHttpError(`Can only create containers with RDF data. ${error.message}`);
      }
      throw error;
    }

    // Solid, §5.3: "Servers MUST NOT allow HTTP POST, PUT and PATCH to update a container’s containment triples;
    // if the server receives such a request, it MUST respond with a 409 status code."
    // https://solid.github.io/specification/protocol#writing-resources
    if (quads.some((quad): boolean => quad.predicate.value === LDP.contains)) {
      throw new ConflictHttpError('Container bodies are not allowed to have containment triples.');
    }

    // Input content type doesn't matter anymore
    representation.metadata.removeAll(CONTENT_TYPE);

    // Container data is stored in the metadata
    representation.metadata.addQuads(quads);
  }

  /**
   * Generates a new URI for a resource in the given container, potentially using the given slug.
   *
   * Solid, §5.3: "Servers MUST allow creating new resources with a POST request to URI path ending `/`.
   * Servers MUST create a resource with URI path ending `/{id}` in container `/`.
   * Servers MUST create a container with URI path ending `/{id}/` in container `/` for requests
   * including the HTTP Link header with rel="type" targeting a valid LDP container type."
   * https://solid.github.io/specification/protocol#writing-resources
   *
   * @param container - Parent container of the new URI.
   * @param isContainer - Does the new URI represent a container?
   * @param slug - Slug to use for the new URI.
   */
  protected createURI(container: ResourceIdentifier, isContainer: boolean, slug?: string): ResourceIdentifier {
    const base = ensureTrailingSlash(container.path);
    const cleanedSlug = slug ? this.cleanSlug(slug) : null;
    const name = cleanedSlug ?? uuid();
    const suffix = isContainer ? '/' : '';
    return { path: `${base}${name}${suffix}` };
  }

  /**
   * Clean http Slug to be compatible with the server. Makes sure there are no unwanted characters
   * e.g.: cleanslug('&/%26') returns '%26%2F%26'
   * @param slug - the slug to clean
   */
  protected cleanSlug(slug: string): string {
    if (/\/[^/]/u.test(slug)) {
      throw new BadRequestHttpError('Slugs should not contain slashes');
    }
    return toCanonicalUriPath(trimTrailingSlashes(slug));
  }

  /**
   * Generate a valid URI to store a new Resource in the given container.
   * URI will be based on the slug header if there is one and is guaranteed to not exist yet.
   *
   * @param container - Identifier of the target container.
   * @param metadata - Metadata of the new resource.
   * @param parentMetadata - Metadata of the parent container.
   */
  protected createSafeUri(container: ResourceIdentifier, metadata: RepresentationMetadata,
    parentMetadata: RepresentationMetadata): ResourceIdentifier {
    // Get all values needed for naming the resource
    const isContainer = this.isNewContainer(metadata);
    const slug = metadata.get(HTTP.slug)?.value;
    metadata.removeAll(HTTP.slug);

    let newID: ResourceIdentifier = this.createURI(container, isContainer, slug);

    // Solid, §5.3: "When a POST method request with the Slug header targets an auxiliary resource,
    // the server MUST respond with the 403 status code and response body describing the error."
    // https://solid.github.io/specification/protocol#writing-resources
    if (this.auxiliaryStrategy.isAuxiliaryIdentifier(newID)) {
      throw new ForbiddenHttpError('Slug bodies that would result in an auxiliary resource are forbidden');
    }

    // Make sure we don't already have a resource with this exact name (or with differing trailing slash)
    const withSlash = ensureTrailingSlash(newID.path);
    const withoutSlash = trimTrailingSlashes(newID.path);
    const exists = parentMetadata.getAll(LDP.contains).some((term): boolean =>
      term.value === withSlash || term.value === withoutSlash);
    if (exists) {
      newID = this.createURI(container, isContainer);
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
    if (this.hasContainerType(metadata.getAll(RDF.type))) {
      return true;
    }
    const slug = suffix ?? metadata.get(HTTP.slug)?.value;
    return Boolean(slug && isContainerPath(slug));
  }

  /**
   * Checks in a list of types if any of them match a Container type.
   */
  protected hasContainerType(rdfTypes: Term[]): boolean {
    return rdfTypes.some((type): boolean => type.value === LDP.Container || type.value === LDP.BasicContainer);
  }

  /**
   * Verifies if this is the metadata of a root storage container.
   */
  protected isRootStorage(metadata: RepresentationMetadata): boolean {
    return metadata.getAll(RDF.type).some((term): boolean => term.value === PIM.Storage);
  }

  /**
   * Extracts the identifiers of all auxiliary resources contained within the given metadata.
   */
  protected getContainedAuxiliaryResources(metadata: RepresentationMetadata): NamedNode[] {
    return metadata.getAll(LDP.terms.contains).filter((object): boolean =>
      this.auxiliaryStrategy.isAuxiliaryIdentifier({ path: object.value })) as NamedNode[];
  }

  /**
   * Deletes the given array of auxiliary identifiers.
   * Does not throw an error if something goes wrong.
   */
  protected async safelyDeleteAuxiliaryResources(identifiers: ResourceIdentifier[]): Promise<void[]> {
    return Promise.all(identifiers.map(async(identifier): Promise<void> => {
      try {
        await this.accessor.deleteResource(identifier);
      } catch (error: unknown) {
        if (!NotFoundHttpError.isInstance(error)) {
          const errorMsg = isNativeError(error) ? error.message : error;
          this.logger.error(`Problem deleting auxiliary resource ${identifier.path}: ${errorMsg}`);
        }
      }
    }));
  }

  /**
   * Create containers starting from the root until the given identifier corresponds to an existing container.
   * Will throw errors if the identifier of the last existing "container" corresponds to an existing document.
   * @param container - Identifier of the container which will need to exist.
   */
  protected async createRecursiveContainers(container: ResourceIdentifier): Promise<void> {
    try {
      const metadata = await this.getNormalizedMetadata(container);
      // See #480
      // Solid, §3.1: "If two URIs differ only in the trailing slash, and the server has associated a resource with
      // one of them, then the other URI MUST NOT correspond to another resource. Instead, the server MAY respond to
      // requests for the latter URI with a 301 redirect to the former."
      // https://solid.github.io/specification/protocol#uri-slash-semantics
      if (!isContainerPath(metadata.identifier.value)) {
        throw new ForbiddenHttpError(`Creating container ${container.path} conflicts with an existing resource.`);
      }
    } catch (error: unknown) {
      if (NotFoundHttpError.isInstance(error)) {
        // Make sure the parent exists first
        if (!this.identifierStrategy.isRootContainer(container)) {
          await this.createRecursiveContainers(this.identifierStrategy.getParentContainer(container));
        }
        await this.writeData(container, new BasicRepresentation([], container), true);
      } else {
        throw error;
      }
    }
  }
}
