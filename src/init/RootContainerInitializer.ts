import { DataFactory } from 'n3';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { TEXT_TURTLE } from '../util/ContentTypes';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { ensureTrailingSlash } from '../util/PathUtil';
import { generateResourceQuads } from '../util/ResourceUtil';
import { guardedStreamFrom } from '../util/StreamUtil';
import { PIM, RDF } from '../util/UriConstants';
import { toCachedNamedNode } from '../util/UriUtil';
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
    if (!await this.hasRootContainer()) {
      await this.createRootContainer();
    }
  }

  /**
   * Verify if a root container already exists in a ResourceStore.
   */
  protected async hasRootContainer(): Promise<boolean> {
    try {
      this.logger.debug(`Checking for root container at ${this.baseId.path}`);
      const result = await this.store.getRepresentation(this.baseId, {});
      this.logger.debug(`Existing root container found at ${this.baseId.path}`);
      result.data.destroy();
      return true;
    } catch (error: unknown) {
      if (!(error instanceof NotFoundHttpError)) {
        throw error;
      }
    }
    return false;
  }

  /**
   * Create a root container in a ResourceStore.
   */
  protected async createRootContainer(): Promise<void> {
    const metadata = new RepresentationMetadata(this.baseId);
    metadata.addQuads(generateResourceQuads(namedNode(this.baseId.path), true));

    // Make sure the root container is a pim:Storage
    // This prevents deletion of the root container as storage root containers can not be deleted
    metadata.add(RDF.type, toCachedNamedNode(PIM.Storage));

    metadata.contentType = TEXT_TURTLE;

    this.logger.debug(`Creating root container at ${this.baseId.path}`);
    await this.store.setRepresentation(this.baseId, {
      binary: true,
      data: guardedStreamFrom([]),
      metadata,
    });
  }
}
