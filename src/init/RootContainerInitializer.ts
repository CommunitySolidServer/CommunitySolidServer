import { DataFactory } from 'n3';
import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { containsResource } from '../storage/StoreUtil';
import { TEXT_TURTLE } from '../util/ContentTypes';
import { ensureTrailingSlash } from '../util/PathUtil';
import { generateResourceQuads } from '../util/ResourceUtil';
import { PIM, RDF } from '../util/Vocabularies';
import { Initializer } from './Initializer';
import namedNode = DataFactory.namedNode;

/**
 * Initializes ResourceStores by creating a root container if it didn't exist yet.
 */
export class RootContainerInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);
  private readonly baseId: ResourceIdentifier;
  private readonly store: ResourceStore;

  public constructor(baseUrl: string, store: ResourceStore) {
    super();
    this.baseId = { path: ensureTrailingSlash(baseUrl) };
    this.store = store;
  }

  public async handle(): Promise<void> {
    this.logger.debug(`Checking for root container at ${this.baseId.path}`);
    if (!await containsResource(this.store, this.baseId)) {
      await this.createRootContainer();
    } else {
      this.logger.debug(`Existing root container found at ${this.baseId.path}`);
    }
  }

  /**
   * Create a root container in a ResourceStore.
   */
  protected async createRootContainer(): Promise<void> {
    const metadata = new RepresentationMetadata(this.baseId, TEXT_TURTLE);
    metadata.addQuads(generateResourceQuads(namedNode(this.baseId.path), true));

    // Make sure the root container is a pim:Storage
    // This prevents deletion of the root container as storage root containers can not be deleted
    metadata.add(RDF.type, PIM.terms.Storage);

    this.logger.debug(`Creating root container at ${this.baseId.path}`);
    await this.store.setRepresentation(this.baseId, new BasicRepresentation([], metadata));
  }
}
