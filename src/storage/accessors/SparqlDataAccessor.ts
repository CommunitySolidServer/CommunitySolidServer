import type { Readable } from 'node:stream';
import arrayifyStream from 'arrayify-stream';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { DataFactory } from 'n3';
import type { NamedNode, Quad } from '@rdfjs/types';
import type {
  ConstructQuery,
  GraphPattern,
  GraphQuads,
  InsertDeleteOperation,
  SparqlGenerator,
  Update,
  UpdateOperation,
} from 'sparqljs';
import { Generator } from 'sparqljs';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import { guardStream } from '../../util/GuardedStream';
import type { Guarded } from '../../util/GuardedStream';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { isContainerIdentifier } from '../../util/PathUtil';
import { CONTENT_TYPE_TERM, LDP } from '../../util/Vocabularies';
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
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly fetcher: SparqlEndpointFetcher;
  private readonly generator: SparqlGenerator;

  public constructor(endpoint: string, identifierStrategy: IdentifierStrategy) {
    this.endpoint = endpoint;
    this.identifierStrategy = identifierStrategy;
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
  public async getData(identifier: ResourceIdentifier): Promise<Guarded<Readable>> {
    const name = namedNode(identifier.path);
    return this.sendSparqlConstruct(this.sparqlConstruct(name));
  }

  /**
   * Returns the metadata for the corresponding identifier.
   * Will throw 404 if no metadata was found.
   */
  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    const name = namedNode(identifier.path);
    const query = this.sparqlConstruct(this.getMetadataNode(name));
    const stream = await this.sendSparqlConstruct(query);
    const quads: Quad[] = await arrayifyStream(stream);

    if (quads.length === 0) {
      throw new NotFoundHttpError();
    }

    const metadata = new RepresentationMetadata(identifier).addQuads(quads);
    if (!isContainerIdentifier(identifier)) {
      metadata.contentType = INTERNAL_QUADS;
    }

    return metadata;
  }

  public async* getChildren(identifier: ResourceIdentifier): AsyncIterableIterator<RepresentationMetadata> {
    // Only triples that have a container identifier as subject are the containment triples
    const name = namedNode(identifier.path);
    const stream = await this.sendSparqlConstruct(this.sparqlConstruct(name));
    for await (const entry of stream) {
      yield new RepresentationMetadata((entry as Quad).object as NamedNode);
    }
  }

  /**
   * Writes the given metadata for the container.
   */
  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    const { name, parent } = this.getRelatedNames(identifier);
    return this.sendSparqlUpdate(this.sparqlInsert(name, metadata, parent));
  }

  /**
   * Reads the given data stream and stores it together with the metadata.
   */
  public async writeDocument(identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata):
  Promise<void> {
    if (this.isMetadataIdentifier(identifier)) {
      throw new ConflictHttpError('Not allowed to create NamedNodes with the metadata extension.');
    }
    const { name, parent } = this.getRelatedNames(identifier);

    const triples = await arrayifyStream<Quad>(data);
    const def = defaultGraph();
    if (triples.some((triple): boolean => !def.equals(triple.graph))) {
      throw new NotImplementedHttpError('Only triples in the default graph are supported.');
    }

    // Not relevant since all content is triples
    metadata.removeAll(CONTENT_TYPE_TERM);

    return this.sendSparqlUpdate(this.sparqlInsert(name, metadata, parent, triples));
  }

  /**
   * Reads the metadata and stores it.
   */
  public async writeMetadata(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    const { name } = this.getRelatedNames(identifier);
    const metaName = this.getMetadataNode(name);

    return this.sendSparqlUpdate(this.sparqlInsertMetadata(metaName, metadata));
  }

  /**
   * Removes all graph data relevant to the given identifier.
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    const { name, parent } = this.getRelatedNames(identifier);
    return this.sendSparqlUpdate(this.sparqlDelete(name, parent));
  }

  /**
   * Helper function to get named nodes corresponding to the identifier and its parent container.
   * In case of a root container only the name will be returned.
   */
  private getRelatedNames(identifier: ResourceIdentifier): { name: NamedNode; parent?: NamedNode } {
    const name = namedNode(identifier.path);

    // Root containers don't have a parent
    if (this.identifierStrategy.isRootContainer(identifier)) {
      return { name };
    }

    const parentIdentifier = this.identifierStrategy.getParentContainer(identifier);
    const parent = namedNode(parentIdentifier.path);
    return { name, parent };
  }

  /**
   * Creates the name for the metadata of a resource.
   *
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
   *
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
   *
   * @param name - Name of the resource to update.
   * @param metadata - New metadata of the resource.
   * @param parent - Name of the parent to update the containment triples.
   * @param triples - New data of the resource.
   */
  private sparqlInsert(name: NamedNode, metadata: RepresentationMetadata, parent?: NamedNode, triples?: Quad[]):
  Update {
    const metaName = this.getMetadataNode(name);

    // Insert new metadata and containment triple
    const insert: GraphQuads[] = [ this.sparqlUpdateGraph(metaName, metadata.quads()) ];
    if (parent) {
      insert.push(this.sparqlUpdateGraph(parent, [ quad(parent, LDP.terms.contains, name) ]));
    }

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
      if (triples.length > 0) {
        insert.push(this.sparqlUpdateGraph(name, triples));
      }
    }

    return {
      updates,
      type: 'update',
      prefixes: {},
    };
  }

  /**
   * Creates an update query that overwrites metadata of a resource.
   *
   * @param metaName - Name of the metadata resource to update.
   * @param metadata - New metadata of the resource.
   */
  private sparqlInsertMetadata(metaName: NamedNode, metadata: RepresentationMetadata): Update {
    // Insert new metadata and containment triple
    const insert: GraphQuads[] = [ this.sparqlUpdateGraph(metaName, metadata.quads()) ];

    // Necessary updates: delete metadata and insert new data
    const updates: UpdateOperation[] = [
      this.sparqlUpdateDeleteAll(metaName),
      {
        updateType: 'insert',
        insert,
      },
    ];

    return {
      updates,
      type: 'update',
      prefixes: {},
    };
  }

  /**
   * Creates a query that deletes everything related to the given name.
   *
   * @param name - Name of resource to delete.
   * @param parent - Parent of the resource to delete so the containment triple can be removed (unless root).
   */
  private sparqlDelete(name: NamedNode, parent?: NamedNode): Update {
    const update: Update = {
      updates: [
        this.sparqlUpdateDeleteAll(name),
        this.sparqlUpdateDeleteAll(this.getMetadataNode(name)),
      ],
      type: 'update',
      prefixes: {},
    };

    if (parent) {
      update.updates.push({
        updateType: 'delete',
        delete: [ this.sparqlUpdateGraph(parent, [ quad(parent, LDP.terms.contains, name) ]) ],
      });
    }

    return update;
  }

  /**
   * Helper function for creating SPARQL update queries.
   * Creates an operation for deleting all triples in a graph.
   *
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
   *
   * @param name - Name of the graph.
   * @param triples - Triples/triple patterns to select.
   */
  private sparqlUpdateGraph(name: NamedNode, triples: Quad[]): GraphQuads {
    return { type: 'graph', name, triples };
  }

  /**
   * Sends a SPARQL CONSTRUCT query to the endpoint and returns a stream of quads.
   *
   * @param sparqlQuery - Query to execute.
   */
  private async sendSparqlConstruct(sparqlQuery: ConstructQuery): Promise<Guarded<Readable>> {
    const query = this.generator.stringify(sparqlQuery);
    this.logger.info(`Sending SPARQL CONSTRUCT query to ${this.endpoint}: ${query}`);
    try {
      return guardStream(await this.fetcher.fetchTriples(this.endpoint, query));
    } catch (error: unknown) {
      this.logger.error(`SPARQL endpoint ${this.endpoint} error: ${createErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Sends a SPARQL update query to the stored endpoint.
   *
   * @param sparqlQuery - Query to send.
   */
  private async sendSparqlUpdate(sparqlQuery: Update): Promise<void> {
    const query = this.generator.stringify(sparqlQuery);
    this.logger.info(`Sending SPARQL UPDATE query to ${this.endpoint}: ${query}`);
    try {
      return await this.fetcher.fetchUpdate(this.endpoint, query);
    } catch (error: unknown) {
      this.logger.error(`SPARQL endpoint ${this.endpoint} error: ${createErrorMessage(error)}`);
      throw error;
    }
  }
}
