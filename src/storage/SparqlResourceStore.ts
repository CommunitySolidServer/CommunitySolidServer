import type { Readable } from 'stream';
import { namedNode, quad, variable } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import { fetch, Request } from 'cross-fetch';
import { Util } from 'n3';
import type { Quad } from 'rdf-js';
import type { AskQuery, ConstructQuery, GraphPattern, SparqlQuery, Update } from 'sparqljs';
import { Generator } from 'sparqljs';
import streamifyArray from 'streamify-array';
import type { Patch } from '../ldp/http/Patch';
import type { Representation } from '../ldp/representation/Representation';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { CONTENT_TYPE_QUADS, DATA_TYPE_QUAD } from '../util/ContentTypes';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { MethodNotAllowedHttpError } from '../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { LINK_TYPE_LDPC, LINK_TYPE_LDPR } from '../util/LinkTypes';
import { CONTAINER_OBJECT, CONTAINS_PREDICATE, RESOURCE_OBJECT, TYPE_PREDICATE } from '../util/MetadataController';
import type { ResourceStoreController } from '../util/ResourceStoreController';
import { ensureTrailingSlash, readableToString, trimTrailingSlashes } from '../util/Util';
import type { ResourceStore } from './ResourceStore';
import inDefaultGraph = Util.inDefaultGraph;

/**
 * Resource store storing its data in a SPARQL endpoint.
 * All requests will throw an {@link NotFoundHttpError} if unknown identifiers get passed.
 */
export class SparqlResourceStore implements ResourceStore {
  private readonly baseRequestURI: string;
  private readonly sparqlEndpoint: string;
  private readonly resourceStoreController: ResourceStoreController;

  /**
   * @param baseRequestURI - Will be stripped of all incoming URIs and added to all outgoing ones to find the relative
   * path.
   * @param sparqlEndpoint - URL of the SPARQL endpoint to use.
   * @param resourceStoreController - Instance of ResourceStoreController to use.
   */
  public constructor(baseRequestURI: string, sparqlEndpoint: string, resourceStoreController: ResourceStoreController) {
    this.baseRequestURI = trimTrailingSlashes(baseRequestURI);
    this.sparqlEndpoint = sparqlEndpoint;
    this.resourceStoreController = resourceStoreController;
  }

  /**
   * Store the incoming data as triples in a graph with URI equal to the identifier in the SPARQL endpoint.
   * @param container - The identifier to store the new data under.
   * @param representation - Data to store. Only Quad streams are supported.
   *
   * @returns The newly generated identifier.
   */
  public async addResource(container: ResourceIdentifier, representation: Representation): Promise<ResourceIdentifier> {
    // Get the expected behaviour based on the incoming identifier and representation.
    const { isContainer, path, newIdentifier } = this.resourceStoreController.getBehaviourAddResource(container,
      representation);

    // Create a new container or resource in the parent container with a specific name based on the incoming headers.
    return this.handleCreation(path, newIdentifier, path.endsWith('/'), isContainer ?
      undefined :
      representation.data, representation.metadata.raw, path.endsWith('/'));
  }

  /**
   * Deletes the given resource.
   * @param identifier - Identifier of resource to delete.
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    // Check if the given path, with the base stripped, is a valid path to perform a delete operation on.
    this.resourceStoreController.validateDeletePath(this.resourceStoreController.parseIdentifier(identifier));

    // Check the resource type and call the corresponding helper function.
    const URI = identifier.path;
    const type = await this.getSparqlResourceType(URI);
    if (type === LINK_TYPE_LDPR) {
      await this.deleteSparqlResource(URI);
    } else if (type === LINK_TYPE_LDPC) {
      await this.deleteSparqlContainer(URI);
    } else {
      throw new NotFoundHttpError();
    }
  }

  /**
   * Returns the stored representation for the given identifier.
   * No preferences are supported.
   * @param identifier - Identifier to retrieve.
   *
   * @returns The corresponding Representation.
   */
  public async getRepresentation(identifier: ResourceIdentifier): Promise<Representation> {
    const URI = identifier.path;
    const type = await this.getSparqlResourceType(URI);

    // Get the resource or container representation of the URI according to its type.
    if (type === LINK_TYPE_LDPR) {
      return await this.getResourceRepresentation(URI);
    }
    if (type === LINK_TYPE_LDPC) {
      return await this.getContainerRepresentation(URI);
    }
    throw new NotFoundHttpError();
  }

  /**
   * Partially update a resource by applying a SPARQL update query.
   * @param identifier - Identifier of resource to update.
   * @param patch - Description of which parts to update.
   */
  public async modifyResource(identifier: ResourceIdentifier, patch: Patch): Promise<void> {
    // The incoming SPARQL query (patch.data) still needs to be modified to work on the graph that corresponds to the
    // identifier!
    return this.sendSparqlUpdate(await readableToString(patch.data));
  }

  /**
   * Replaces the stored Representation with the new one for the given identifier.
   * @param identifier - Identifier to replace.
   * @param representation - New Representation.
   */
  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    // Get the expected behaviour based on the incoming identifier and representation.
    const { isContainer, path, newIdentifier } = this.resourceStoreController.getBehaviourSetRepresentation(identifier,
      representation);

    // Create a new container or resource in the parent container with a specific name based on the incoming headers.
    await this.handleCreation(path, newIdentifier, true, isContainer ?
      undefined :
      representation.data, representation.metadata.raw, false);
  }

  /**
   * Helper function to create or replace a container or resource.
   * Will call the appropriate function after additional validation.
   * @param path - The stripped path without the base of the store.
   * @param newIdentifier - The name of the resource to be created or overwritten.
   * @param allowRecursiveCreation - Whether necessary but not existing intermediate containers may be created.
   * @param data - Data of the resource. None for a container.
   * @param metadata - Optional metadata to be stored in the metadata graph.
   * @param overwriteMetadata - Whether metadata for an already existing container may be overwritten with the provided
   * metadata.
   */
  private async handleCreation(path: string, newIdentifier: string, allowRecursiveCreation: boolean,
    data?: Readable, metadata?: Quad[], overwriteMetadata = false): Promise<ResourceIdentifier> {
    await this.ensureValidContainerPath(path, allowRecursiveCreation);
    const URI = `${this.baseRequestURI}${ensureTrailingSlash(path)}${newIdentifier}`;
    return typeof data === 'undefined' ?
      await this.handleContainerCreation(URI, metadata, overwriteMetadata) :
      await this.handleResourceCreation(URI, data, metadata);
  }

  /**
   * Helper function to (over)write a resource.
   * @param resourceURI - The URI of the resource.
   * @param data - Data of the resource.
   * @param metadata - Optional metadata to be stored in the metadata graph.
   *
   * @throws {@link ConflictHttpError}
   * If a container with that identifier already exists.
   */
  private async handleResourceCreation(resourceURI: string, data: Readable, metadata?: Quad[]):
  Promise<ResourceIdentifier> {
    const type = await this.getSparqlResourceType(resourceURI);
    if (type === LINK_TYPE_LDPC) {
      throw new ConflictHttpError('Container with that identifier already exists.');
    }
    await this.createResource(resourceURI, await arrayifyStream(data), metadata);
    return { path: resourceURI };
  }

  /**
   * Helper function to create a container.
   * @param containerURI - The URI of the container.
   * @param metadata - Optional metadata to be stored in the metadata graph.
   * @param overwriteMetadata - Whether metadata may be overwritten with the provided metadata if the container already
   * exists.
   *
   * @throws {@link ConflictHttpError}
   * If a resource or container with that identifier already exists.
   */
  private async handleContainerCreation(containerURI: string, metadata?: Quad[], overwriteMetadata = false):
  Promise<ResourceIdentifier> {
    const type = await this.getSparqlResourceType(containerURI);
    if (type === LINK_TYPE_LDPR) {
      throw new ConflictHttpError('Resource with that identifier already exists.');
    } else if (typeof type === 'undefined') {
      await this.createContainer(containerURI, metadata);
    } else if (overwriteMetadata) {
      await this.overwriteContainerMetadata(containerURI, this.ensureValidQuads('metadata', metadata));
    } else {
      throw new ConflictHttpError('Container with that identifier already exists.');
    }

    return { path: containerURI };
  }

  /**
   * Loop from the base URI via all subcontainers to the smallest parent container in which the new container should
   * be created and check if they are all valid containers.
   * Creates intermediate containers if a missing container is not a resource and allowRecursiveCreation is true.
   * @param path - Path to smallest container to check.
   * @param allowRecursiveCreation - Whether necessary but not existing intermediate containers may be created.
   *
   * @throws {@link MethodNotAllowedHttpError}
   * If one of the intermediate containers is not a valid container.
   */
  private async ensureValidContainerPath(path: string, allowRecursiveCreation: boolean): Promise<void> {
    const parentContainers = path.split('/').filter((container): any => container);
    let currentContainerURI = `${this.baseRequestURI}/`;

    // Check each intermediate container one by one.
    while (parentContainers.length) {
      currentContainerURI = `${currentContainerURI}${parentContainers.shift()}/`;
      const type = await this.getSparqlResourceType(currentContainerURI);
      if (typeof type === 'undefined') {
        if (allowRecursiveCreation) {
          await this.createContainer(currentContainerURI);
        } else {
          throw new MethodNotAllowedHttpError('The given path is not a valid container.');
        }
      } else if (type === LINK_TYPE_LDPR) {
        throw new MethodNotAllowedHttpError('The given path is not a valid container.');
      }
    }
  }

  /**
   * Queries the SPARQL endpoint to determine which type the URI is associated with.
   * @param URI - URI of the Graph holding the resource.
   * @returns LINK_TYPE_LDPC if the URI matches a container, LINK_TYPE_LDPR if it matches a resource or undefined if it
   * is neither.
   */
  private async getSparqlResourceType(URI: string): Promise<string | undefined> {
    // Check for container first, because a container also contains ldp:Resource.
    const containerQuery = {
      queryType: 'ASK',
      where: [
        {
          type: 'graph',
          name: namedNode(`${ensureTrailingSlash(URI)}.metadata`),
          triples: [
            quad(variable('p'), TYPE_PREDICATE, CONTAINER_OBJECT),
          ],
        },
      ],
      type: 'query',
    } as unknown as AskQuery;
    if ((await this.sendSparqlQuery(containerQuery)).boolean === true) {
      return LINK_TYPE_LDPC;
    }

    // Check that the URI matches a resource, if it was not a container.
    const resourceQuery = {
      queryType: 'ASK',
      where: [
        {
          type: 'graph',
          name: namedNode(`${trimTrailingSlashes(URI)}.metadata`),
          triples: [
            quad(variable('p'), TYPE_PREDICATE, RESOURCE_OBJECT),
          ],
        },
      ],
      type: 'query',
    } as unknown as AskQuery;
    if ((await this.sendSparqlQuery(resourceQuery)).boolean === true) {
      return LINK_TYPE_LDPR;
    }
  }

  /**
   * Create a SPARQL graph to represent a container and another one for its metadata.
   * @param containerURI - URI of the container to create.
   * @param metadata - Optional container metadata.
   */
  private async createContainer(containerURI: string, metadata?: Quad[]): Promise<void> {
    // Verify the metadata quads to be saved and get the URI from the parent container.
    const metadataQuads = this.ensureValidQuads('metadata', metadata);
    const parentContainerURI = this.getParentContainer(containerURI);

    // First create containerURI/.metadata graph with `containerURI a ldp:Container, ldp:Resource` and metadata triples.
    // Then create containerURI graph with `containerURI contains containerURI/.metadata` triple.
    // Then add `parentContainerURI contains containerURI` triple in parentContainerURI graph.
    const createContainerQuery = {
      updates: [
        {
          updateType: 'insert',
          insert: [
            {
              type: 'graph',
              name: namedNode(`${containerURI}.metadata`),
              triples: [
                quad(namedNode(containerURI), TYPE_PREDICATE, CONTAINER_OBJECT),
                quad(namedNode(containerURI), TYPE_PREDICATE, RESOURCE_OBJECT),
                ...metadataQuads,
              ],
            },
            {
              type: 'graph',
              name: namedNode(containerURI),
              triples: [
                quad(namedNode(containerURI), CONTAINS_PREDICATE, namedNode(`${containerURI}.metadata`)),
              ],
            },
            {
              type: 'graph',
              name: namedNode(parentContainerURI),
              triples: [
                quad(namedNode(parentContainerURI), CONTAINS_PREDICATE, namedNode(containerURI)),
              ],
            },
          ],
        },
      ],
      type: 'update',
      prefixes: {},
    } as Update;
    return this.sendSparqlUpdate(createContainerQuery);
  }

  /**
   * Replaces the current metadata for a container.
   * Helper function without extra validation.
   * @param containerURI - URI of the container to create.
   * @param metadata - New container metadata.
   */
  private async overwriteContainerMetadata(containerURI: string, metadata: Quad[]): Promise<void> {
    // First remove all triples from the metadata graph and then write the new metadata triples to that graph.
    const overwriteMetadataQuery = {
      updates: [
        {
          updateType: 'insertdelete',
          delete: [
            {
              type: 'graph',
              name: namedNode(`${containerURI}.metadata`),
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
          ],
          insert: [
            {
              type: 'graph',
              name: namedNode(`${containerURI}.metadata`),
              triples: [
                quad(namedNode(containerURI), TYPE_PREDICATE, CONTAINER_OBJECT),
                quad(namedNode(containerURI), TYPE_PREDICATE, RESOURCE_OBJECT),
                ...metadata,
              ],
            },
          ],
          where: [
            {
              type: 'bgp',
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
          ],
        },
      ],
      type: 'update',
      prefixes: {},
    } as Update;
    return this.sendSparqlUpdate(overwriteMetadataQuery);
  }

  /**
   * Create a SPARQL graph to represent a resource and another one for its metadata.
   * Helper function without extra validation.
   * @param resourceURI - URI of the container to create.
   * @param data - The data to be put in the graph.
   * @param metadata - Optional resource metadata.
   */
  private async createResource(resourceURI: string, data: Quad[], metadata?: Quad[]): Promise<void> {
    // Validate the data and metadata quads by throwing an error for non-default-graph quads and return an empty list
    // if the metadata quads are undefined.
    const dataQuads = this.ensureValidQuads('data', data);
    const metadataQuads = this.ensureValidQuads('metadata', metadata);
    const containerURI = ensureTrailingSlash(resourceURI.slice(0, resourceURI.lastIndexOf('/')));

    // First remove the possible current resource on given identifier and its corresponding metadata file.
    // Then create a `resourceURI/.metadata` graph with `resourceURI a ldp:Resource` and the metadata triples, a
    // resourceURI graph with the data triples, and add a `containerURI contains resourceURI` to the containerURI graph.
    const createResourceQuery = {
      updates: [
        {
          updateType: 'insertdelete',
          delete: [
            {
              type: 'graph',
              name: namedNode(`${resourceURI}.metadata`),
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
            {
              type: 'graph',
              name: namedNode(resourceURI),
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
          ],
          insert: [
            {
              type: 'graph',
              name: namedNode(`${resourceURI}.metadata`),
              triples: [
                quad(namedNode(resourceURI), TYPE_PREDICATE, RESOURCE_OBJECT),
                ...metadataQuads,
              ],
            },
            {
              type: 'graph',
              name: namedNode(resourceURI),
              triples: [
                ...dataQuads,
              ],
            },
            {
              type: 'graph',
              name: namedNode(containerURI),
              triples: [
                quad(namedNode(containerURI), CONTAINS_PREDICATE, namedNode(resourceURI)),
              ],
            },
          ],
          where: [
            {
              type: 'bgp',
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
          ],
        },
      ],
      type: 'update',
      prefixes: {},
    } as Update;
    return this.sendSparqlUpdate(createResourceQuery);
  }

  /**
   * Helper function to delete a resource.
   * @param resourceURI - Identifier of resource to delete.
   */
  private async deleteSparqlResource(resourceURI: string): Promise<void> {
    // Get the container URI that contains the resource corresponding to the URI.
    const containerURI = ensureTrailingSlash(resourceURI.slice(0, resourceURI.lastIndexOf('/')));

    // First remove `resourceURI/.metadata` graph. Then remove resourceURI graph and finally remove
    // `containerURI contains resourceURI` triple.
    const deleteResourceQuery = {
      updates: [
        {
          updateType: 'insertdelete',
          delete: [
            {
              type: 'graph',
              name: namedNode(`${resourceURI}.metadata`),
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
            {
              type: 'graph',
              name: namedNode(resourceURI),
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
            {
              type: 'graph',
              name: namedNode(containerURI),
              triples: [
                quad(namedNode(containerURI), CONTAINS_PREDICATE, namedNode(resourceURI)),
              ],
            },
          ],
          insert: [],
          where: [
            {
              type: 'bgp',
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
          ],
        },
      ],
      type: 'update',
      prefixes: {},
    } as Update;
    return this.sendSparqlUpdate(deleteResourceQuery);
  }

  /**
   * Helper function to delete a container.
   * @param containerURI - Identifier of container to delete.
   */
  private async deleteSparqlContainer(containerURI: string): Promise<void> {
    // Throw an error if the container is not empty.
    if (!await this.isEmptyContainer(containerURI)) {
      throw new ConflictHttpError('Container is not empty.');
    }

    // Get the parent container from the specified container to remove the containment triple.
    const parentContainerURI = this.getParentContainer(containerURI);

    // First remove `containerURI/.metadata` graph. Then remove containerURI graph and finally remove
    // `parentContainerURI contains containerURI` triple from parentContainerURI graph.
    const deleteContainerQuery = {
      updates: [
        {
          updateType: 'insertdelete',
          delete: [
            {
              type: 'graph',
              name: namedNode(`${containerURI}.metadata`),
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
            {
              type: 'graph',
              name: namedNode(containerURI),
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
            {
              type: 'graph',
              name: namedNode(parentContainerURI),
              triples: [
                quad(namedNode(parentContainerURI), CONTAINS_PREDICATE, namedNode(containerURI)),
              ],
            },
          ],
          insert: [],
          where: [
            {
              type: 'bgp',
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
          ],
        },
      ],
      type: 'update',
      prefixes: {},
    } as Update;
    return this.sendSparqlUpdate(deleteContainerQuery);
  }

  /**
   * Checks whether the specified container is empty.
   * Ignores the .metadata file corresponding to the container.
   * @param containerURI - Identifier of the container.
   */
  private async isEmptyContainer(containerURI: string): Promise<boolean> {
    const containerQuery = {
      queryType: 'ASK',
      where: [
        {
          type: 'graph',
          name: namedNode(containerURI),
          triples: [
            quad(namedNode(containerURI), CONTAINS_PREDICATE, variable('o')),
            {
              type: 'filter',
              expression: {
                type: 'operation',
                operator: '!=',
                args: [
                  variable('o'),
                  namedNode(`${containerURI}.metadata`),
                ],
              },
            },
          ],
        },
      ],
      type: 'query',
    } as unknown as AskQuery;
    const result = await this.sendSparqlQuery(containerQuery);
    return !result.boolean;
  }

  /**
   * Helper function without extra validation to get all triples in a graph corresponding to the specified URI.
   * @param URI - URI of the resource.
   */
  private async getSparqlRepresentation(URI: string): Promise<any> {
    const representationQuery = {
      queryType: 'CONSTRUCT',
      template: [
        quad(variable('s'), variable('p'), variable('o')),
      ],
      where: [
        {
          type: 'graph',
          name: namedNode(URI),
          patterns: [
            {
              type: 'bgp',
              triples: [
                quad(variable('s'), variable('p'), variable('o')),
              ],
            },
          ],
        } as GraphPattern,
      ],
      type: 'query',
      prefixes: {},
    } as ConstructQuery;
    return (await this.sendSparqlQuery(representationQuery)).results.bindings;
  }

  /**
   * Helper function to get the representation of a document resource.
   * @param resourceURI - Identifier of the resource to retrieve.
   */
  private async getResourceRepresentation(resourceURI: string): Promise<Representation> {
    // Get the triples from the resourceURI graph and from the corresponding metadata graph.
    const data: Quad[] = await this.getSparqlRepresentation(resourceURI);
    const metadata: Quad[] = await this.getSparqlRepresentation(`${resourceURI}.metadata`);

    // Only include the triples of the resource graph in the data readable.
    const readableData = streamifyArray([ ...data ]);
    return {
      dataType: DATA_TYPE_QUAD,
      data: readableData,
      metadata: {
        raw: metadata,
        contentType: CONTENT_TYPE_QUADS,
      },
    };
  }

  /**
   * Helper function to get the representation of a container.
   * @param containerURI - Identifier of the container to retrieve.
   */
  private async getContainerRepresentation(containerURI: string): Promise<Representation> {
    // Get the triples from the containerURI graph and from the corresponding metadata graph.
    const data: Quad[] = await this.getSparqlRepresentation(containerURI);
    const metadata: Quad[] = await this.getSparqlRepresentation(`${containerURI}.metadata`);

    // Include both the triples of the resource graph and the metadata graph in the data readable.
    const readableData = streamifyArray([ ...data, ...metadata ]);
    return {
      dataType: DATA_TYPE_QUAD,
      data: readableData,
      metadata: {
        raw: metadata,
        contentType: CONTENT_TYPE_QUADS,
      },
    };
  }

  /**
   * Helper function to make sure that all incoming quads are in the default graph.
   * If the incoming quads are undefined, an empty array is returned instead.
   * @param type - Type of the quads to indicate in the possible error.
   * @param quads - Incoming quads.
   *
   * @throws {@link ConflictHttpError}
   * If one or more quads are not in the default graph.
   */
  private ensureValidQuads(type: string, quads?: Quad[]): Quad[] {
    if (quads) {
      if (!quads.every((x): any => inDefaultGraph(x))) {
        throw new ConflictHttpError(`All ${type} quads should be in the default graph.`);
      }
      return quads;
    }
    return [];
  }

  /**
   * Helper function to get the parent container URI of a container URI.
   * @param containerURI - Incoming container URI.
   */
  private getParentContainer(containerURI: string): string {
    const [ , parentContainerURI ] = /^(.*\/)[^/]+\/$/u.exec(containerURI) ?? [];
    if (typeof parentContainerURI !== 'string') {
      throw new Error('Invalid containerURI passed.');
    }
    return parentContainerURI;
  }

  /**
   * Helper function without extra validation to send a query to the SPARQL endpoint.
   * @param sparqlQuery - Query to send.
   */
  private async sendSparqlQuery(sparqlQuery: SparqlQuery): Promise<any> {
    // Generate the string SPARQL query from the SparqlQuery object.
    const generator = new Generator();
    const generatedQuery = generator.stringify(sparqlQuery);

    // Send the HTTP request.
    const init = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        Accept: 'application/json',
      },
      body: generatedQuery,
    };
    const request = new Request(this.sparqlEndpoint);
    const response = await fetch(request, init);

    // Check if the server returned an error and return the json representation of the result.
    if (response.status >= 400) {
      throw new Error('Bad response from server');
    }
    return response.json();
  }

  /**
   * Helper function without extra validation to send an update query to the SPARQL endpoint.
   * @param sparqlQuery - Query to send. In the case of a string, the literal input is forwarded.
   */
  private async sendSparqlUpdate(sparqlQuery: SparqlQuery | string): Promise<void> {
    // Generate the string SPARQL query from the SparqlQuery object if it is passed as such.
    let generatedQuery;
    if (typeof sparqlQuery === 'string') {
      generatedQuery = sparqlQuery;
    } else {
      const generator = new Generator();
      generatedQuery = generator.stringify(sparqlQuery);
    }

    // Send the HTTP request.
    const init = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-update',
      },
      body: generatedQuery,
    };
    const request = new Request(this.sparqlEndpoint);
    const response = await fetch(request, init);

    // Check if the server returned an error.
    if (response.status >= 400) {
      throw new Error('Bad response from server');
    }
  }
}
