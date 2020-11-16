import type { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { DataFactory } from 'n3';
import type { NamedNode, Quad } from 'rdf-js';
import type {
  ConstructQuery, GraphPattern,
  GraphQuads,
  InsertDeleteOperation,
  SparqlGenerator,
  Update,
  UpdateOperation,
} from 'sparqljs';
import {
  Generator,
} from 'sparqljs';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import type { MetadataController } from '../../util/MetadataController';
import { StreamMonitor } from '../../util/StreamMonitor';
import { CONTENT_TYPE, LDP } from '../../util/UriConstants';
import { toNamedNode } from '../../util/UriUtil';
import { ensureTrailingSlash } from '../../util/Util';
import type { ContainerManager } from '../ContainerManager';
import type { DataAccessor } from './DataAccessor';

const { defaultGraph, namedNode, quad, variable } = DataFactory;

/**
 * Stores all data and metadata of resources in a SPARQL backend.
 * Communication is done by sending SPARQL queries.
 * Queries are constructed in such a way to keep everything consistent,
 * such as updating containment triples and deleting old data when it is overwritten.
 *
 * Since metadata is hidden, no containment triples are stored for metadata files.
 *
 * All input container metadata is stored in its metadata identifier.
 * The containment triples are stored in the graph corresponding to the actual identifier
 * so those don't get overwritten.
 */
export class SparqlDataAccessor implements DataAccessor {
  protected readonly logger = getLoggerFor(this);
  private readonly endpoint: string;
  private readonly base: string;
  private readonly containerManager: ContainerManager;
  private readonly metadataController: MetadataController;
  private readonly fetcher: SparqlEndpointFetcher;
  private readonly generator: SparqlGenerator;

  public constructor(endpoint: string, base: string, containerManager: ContainerManager,
    metadataController: MetadataController) {
    this.endpoint = endpoint;
    this.base = ensureTrailingSlash(base);
    this.containerManager = containerManager;
    this.metadataController = metadataController;
    this.fetcher = new SparqlEndpointFetcher();
    this.generator = new Generator();
  }

  /**
   * Only Quad data streams are supported.
   */
  public async canHandle(representation: Representation): Promise<void> {
    if (representation.binary || representation.metadata.contentType !== INTERNAL_QUADS) {
      throw new UnsupportedMediaTypeHttpError('Only Quad data is supported.');
    }
  }

  /**
   * Returns all triples stored for the corresponding identifier.
   * Note that this will not throw a 404 if no results were found.
   */
  public async getData(identifier: ResourceIdentifier): Promise<Readable> {
    const name = namedNode(identifier.path);
    return this.sendSparqlConstruct(this.sparqlConstruct(name));
  }

  /**
   * Returns the metadata for the corresponding identifier.
   * Will throw 404 if no metadata was found.
   */
  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    const name = namedNode(identifier.path);
    const query = identifier.path.endsWith('/') ?
      this.sparqlConstructContainer(name) :
      this.sparqlConstruct(this.getMetadataNode(name));
    const stream = await this.sendSparqlConstruct(query);
    const quads = await arrayifyStream(stream);

    // Root container will not have metadata if there are no containment triples
    if (quads.length === 0 && identifier.path !== this.base) {
      throw new NotFoundHttpError();
    }

    const metadata = new RepresentationMetadata(identifier.path).addQuads(quads);
    metadata.contentType = INTERNAL_QUADS;

    // Need to generate type metadata for the root container since it's not stored
    if (identifier.path === this.base) {
      metadata.addQuads(this.metadataController.generateResourceQuads(name, true));
    }

    return metadata;
  }

  /**
   * Writes the given metadata for the container.
   */
  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    const { name, parent } = await this.getRelatedNames(identifier);
    return this.sendSparqlUpdate(this.sparqlInsert(name, parent, metadata));
  }

  /**
   * Reads the given data stream and stores it together with the metadata.
   */
  public async writeDocument(identifier: ResourceIdentifier, data: Readable, metadata: RepresentationMetadata):
  Promise<void> {
    if (this.isMetadataIdentifier(identifier)) {
      throw new ConflictHttpError('Not allowed to create NamedNodes with the metadata extension.');
    }

    const monitor = new StreamMonitor(data, 'SparqlDataAccessor-writeDocument');

    const { name, parent } = await this.getRelatedNames(identifier);

    monitor.release();

    const triples = await arrayifyStream(data) as Quad[];
    const def = defaultGraph();
    if (triples.some((triple): boolean => !def.equals(triple.graph))) {
      throw new UnsupportedHttpError('Only triples in the default graph are supported.');
    }

    // Not relevant since all content is triples
    metadata.removeAll(CONTENT_TYPE);

    return this.sendSparqlUpdate(this.sparqlInsert(name, parent, metadata, triples));
  }

  /**
   * Removes all graph data relevant to the given identifier.
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    const { name, parent } = await this.getRelatedNames(identifier);
    return this.sendSparqlUpdate(this.sparqlDelete(name, parent));
  }

  /**
   * Helper function to get named nodes corresponding to the identifier and its parent container.
   */
  private async getRelatedNames(identifier: ResourceIdentifier): Promise<{ name: NamedNode; parent: NamedNode }> {
    const parentIdentifier = await this.containerManager.getContainer(identifier);
    const name = namedNode(identifier.path);
    const parent = namedNode(parentIdentifier.path);
    return { name, parent };
  }

  /**
   * Creates the name for the metadata of a resource.
   * @param name - Name of the (non-metadata) resource.
   */
  private getMetadataNode(name: NamedNode): NamedNode {
    return namedNode(`meta:${name.value}`);
  }

  /**
   * Checks if the given identifier corresponds to the names used for metadata identifiers.
   */
  private isMetadataIdentifier(identifier: ResourceIdentifier): boolean {
    return identifier.path.startsWith('meta:');
  }

  /**
   * Creates a CONSTRUCT query that returns all quads contained within a single resource.
   * @param name - Name of the resource to query.
   */
  private sparqlConstruct(name: NamedNode): ConstructQuery {
    const pattern = quad(variable('s'), variable('p'), variable('o'));
    return {
      queryType: 'CONSTRUCT',
      template: [ pattern ],
      where: [ this.sparqlSelectGraph(name, [ pattern ]) ],
      type: 'query',
      prefixes: {},
    };
  }

  private sparqlConstructContainer(name: NamedNode): ConstructQuery {
    const pattern = quad(variable('s'), variable('p'), variable('o'));
    return {
      queryType: 'CONSTRUCT',
      template: [ pattern ],
      where: [{
        type: 'union',
        patterns: [
          this.sparqlSelectGraph(name, [ pattern ]),
          this.sparqlSelectGraph(this.getMetadataNode(name), [ pattern ]),
        ],
      }],
      type: 'query',
      prefixes: {},
    };
  }

  private sparqlSelectGraph(name: NamedNode, triples: Quad[]): GraphPattern {
    return {
      type: 'graph',
      name,
      patterns: [{ type: 'bgp', triples }],
    };
  }

  /**
   * Creates an update query that overwrites the data and metadata of a resource.
   * If there are no triples we assume it's a container (so don't overwrite the main graph with containment triples).
   * @param name - Name of the resource to update.
   * @param parent - Name of the parent to update the containment triples.
   * @param metadata - New metadata of the resource.
   * @param triples - New data of the resource.
   */
  private sparqlInsert(name: NamedNode, parent: NamedNode, metadata: RepresentationMetadata, triples?: Quad[]): Update {
    const metaName = this.getMetadataNode(name);

    // Insert new metadata and containment triple
    const insert: GraphQuads[] = [
      this.sparqlUpdateGraph(metaName, metadata.quads()),
      this.sparqlUpdateGraph(parent, [ quad(parent, toNamedNode(LDP.contains), name) ]),
    ];

    // Necessary updates: delete metadata and insert new data
    const updates: UpdateOperation[] = [
      this.sparqlUpdateDeleteAll(metaName),
      {
        updateType: 'insert',
        insert,
      },
    ];

    // Only overwrite data triples for documents
    if (triples) {
      // This needs to be first so it happens before the insert
      updates.unshift(this.sparqlUpdateDeleteAll(name));
      insert.push(this.sparqlUpdateGraph(name, triples));
    }

    return {
      updates,
      type: 'update',
      prefixes: {},
    };
  }

  /**
   * Creates a query that deletes everything related to the given name.
   * @param name - Name of resource to delete.
   * @param parent - Parent of the resource to delete so containment triple can be removed.
   */
  private sparqlDelete(name: NamedNode, parent: NamedNode): Update {
    return {
      updates: [
        this.sparqlUpdateDeleteAll(name),
        this.sparqlUpdateDeleteAll(this.getMetadataNode(name)),
        {
          updateType: 'delete',
          delete: [ this.sparqlUpdateGraph(parent, [ quad(parent, toNamedNode(LDP.contains), name) ]) ],
        },
      ],
      type: 'update',
      prefixes: {},
    };
  }

  /**
   * Helper function for creating SPARQL update queries.
   * Creates an operation for deleting all triples in a graph.
   * @param name - Name of the graph to delete.
   */
  private sparqlUpdateDeleteAll(name: NamedNode): InsertDeleteOperation {
    return {
      updateType: 'deletewhere',
      delete: [ this.sparqlUpdateGraph(name, [ quad(variable(`s`), variable(`p`), variable(`o`)) ]) ],
    };
  }

  /**
   * Helper function for creating SPARQL update queries.
   * Creates a Graph selector with the given triples.
   * @param name - Name of the graph.
   * @param triples - Triples/triple patterns to select.
   */
  private sparqlUpdateGraph(name: NamedNode, triples: Quad[]): GraphQuads {
    return { type: 'graph', name, triples };
  }

  /**
   * Sends a SPARQL CONSTRUCT query to the endpoint and returns a stream of quads.
   * @param sparqlQuery - Query to execute.
   */
  private async sendSparqlConstruct(sparqlQuery: ConstructQuery): Promise<Readable> {
    const query = this.generator.stringify(sparqlQuery);
    this.logger.info(`Sending SPARQL CONSTRUCT query to ${this.endpoint}: ${query}`);
    try {
      return await this.fetcher.fetchTriples(this.endpoint, query);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`SPARQL endpoint ${this.endpoint} error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Sends a SPARQL update query to the stored endpoint.
   * @param sparqlQuery - Query to send.
   */
  private async sendSparqlUpdate(sparqlQuery: Update): Promise<void> {
    const query = this.generator.stringify(sparqlQuery);
    this.logger.info(`Sending SPARQL UPDATE query to ${this.endpoint}: ${query}`);
    try {
      return await this.fetcher.fetchUpdate(this.endpoint, query);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`SPARQL endpoint ${this.endpoint} error: ${error.message}`);
      }
      throw error;
    }
  }
}
