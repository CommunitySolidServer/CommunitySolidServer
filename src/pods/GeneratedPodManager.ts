import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { addGeneratedResources } from './generate/GenerateUtil';
import type { ResourcesGenerator } from './generate/ResourcesGenerator';
import type { PodManager } from './PodManager';
import type { PodSettings } from './settings/PodSettings';

/**
 * Pod manager that uses an {@link IdentifierGenerator} and {@link ResourcesGenerator}
 * to create the default resources and identifier for a new pod.
 */
export class GeneratedPodManager implements PodManager {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly resourcesGenerator: ResourcesGenerator;

  public constructor(store: ResourceStore, resourcesGenerator: ResourcesGenerator) {
    this.store = store;
    this.resourcesGenerator = resourcesGenerator;
  }

  /**
   * Creates a new pod, pre-populating it with the resources created by the data generator.
   * Will throw an error if the given identifier already has a resource.
   */
  public async createPod(identifier: ResourceIdentifier, settings: PodSettings, overwrite: boolean): Promise<void> {
    this.logger.info(`Creating pod ${identifier.path}`);
    if (!overwrite && await this.store.resourceExists(identifier)) {
      throw new ConflictHttpError(`There already is a resource at ${identifier.path}`);
    }

    const count = await addGeneratedResources(identifier, settings, this.resourcesGenerator, this.store);
    this.logger.info(`Added ${count} resources to ${identifier.path}`);
  }
}
