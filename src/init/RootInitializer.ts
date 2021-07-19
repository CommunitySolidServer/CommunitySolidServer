import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourcesGenerator } from '../pods/generate/ResourcesGenerator';
import type { ResourceStore } from '../storage/ResourceStore';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { ensureTrailingSlash } from '../util/PathUtil';
import { PIM, RDF } from '../util/Vocabularies';
import { Initializer } from './Initializer';

/**
 * Initializer that sets up the root container.
 * Will copy all the files and folders in the given path to the corresponding documents and containers.
 * This will always happen when the server starts unless the following 2 conditions are both fulfilled:
 *  * The container already exists.
 *  * The container has metadata indicating it is a pim:Storage.
 *
 * It is important that the ResourcesGenerator generates a `<> a pim:Storage` triple for the root container:
 * this prevents deletion of the root container as storage root containers can not be deleted.
 * Solid, §4.1: "Servers exposing the storage resource MUST advertise by including the HTTP Link header
 * with rel="type" targeting http://www.w3.org/ns/pim/space#Storage when responding to storage’s request URI."
 * https://solid.github.io/specification/protocol#storage
 */
export class RootInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly baseId: ResourceIdentifier;
  private readonly generator: ResourcesGenerator;

  public constructor(baseUrl: string, store: ResourceStore, generator: ResourcesGenerator) {
    super();
    this.baseId = { path: ensureTrailingSlash(baseUrl) };
    this.store = store;
    this.generator = generator;
  }

  public async handle(): Promise<void> {
    this.logger.debug(`Checking for valid root container at ${this.baseId.path}`);
    if (!await this.rootContainerIsValid()) {
      this.logger.info(`Root container not found; initializing it.`);
      const resources = this.generator.generate(this.baseId, {});
      let count = 0;
      for await (const { identifier: resourceId, representation } of resources) {
        try {
          await this.store.setRepresentation(resourceId, representation);
          count += 1;
        } catch (error: unknown) {
          this.logger.warn(`Failed to create resource ${resourceId.path}: ${createErrorMessage(error)}`);
        }
      }
      this.logger.info(`Initialized root container with ${count} resources.`);
    } else {
      this.logger.debug(`Valid root container found at ${this.baseId.path}`);
    }
  }

  /**
   * Verifies if the root container already exists and has the pim:Storage type.
   */
  private async rootContainerIsValid(): Promise<boolean> {
    try {
      const representation = await this.store.getRepresentation(this.baseId, {});
      representation.data.destroy();
      return representation.metadata.getAll(RDF.terms.type).some((term): boolean => term.equals(PIM.terms.Storage));
    } catch (error: unknown) {
      if (NotFoundHttpError.isInstance(error)) {
        return false;
      }
      throw error;
    }
  }
}
