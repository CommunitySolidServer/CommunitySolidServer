import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { TEXT_TURTLE } from '../util/ContentTypes';
import { ensureTrailingSlash } from '../util/PathUtil';
import { addResourceMetadata } from '../util/ResourceUtil';
import { PIM, RDF } from '../util/Vocabularies';
import { Initializer } from './Initializer';

/**
 * Initializes ResourceStores by creating a root container if it didn't exist yet.
 *
 * Solid, §4.1: "When a server supports a data pod, it MUST provide one or more storages (pim:Storage) –
 * a space of URIs in which data can be accessed. A storage is the root container for all of its contained resources."
 * https://solid.github.io/specification/protocol#storage
 */
export class RootContainerInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);
  private readonly store: ResourceStore;
  private readonly baseId: ResourceIdentifier;

  public constructor(settings: { store: ResourceStore; baseUrl: string }) {
    super();
    this.store = settings.store;
    this.baseId = { path: ensureTrailingSlash(settings.baseUrl) };
  }

  public async handle(): Promise<void> {
    this.logger.debug(`Checking for root container at ${this.baseId.path}`);
    if (!await this.store.resourceExists(this.baseId)) {
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
    addResourceMetadata(metadata, true);

    // Make sure the root container is a pim:Storage
    // This prevents deletion of the root container as storage root containers can not be deleted
    // Solid, §4.1: "Servers exposing the storage resource MUST advertise by including the HTTP Link header
    // with rel="type" targeting http://www.w3.org/ns/pim/space#Storage when responding to storage’s request URI."
    // https://solid.github.io/specification/protocol#storage
    metadata.add(RDF.type, PIM.terms.Storage);

    this.logger.debug(`Creating root container at ${this.baseId.path}`);
    await this.store.setRepresentation(this.baseId, new BasicRepresentation([], metadata));
  }
}
