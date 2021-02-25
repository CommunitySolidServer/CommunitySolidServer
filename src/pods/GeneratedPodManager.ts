import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { addGeneratedResources } from './generate/GenerateUtil';
import type { IdentifierGenerator } from './generate/IdentifierGenerator';
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
  private readonly idGenerator: IdentifierGenerator;
  private readonly resourcesGenerator: ResourcesGenerator;

  public constructor(store: ResourceStore, idGenerator: IdentifierGenerator, resourcesGenerator: ResourcesGenerator) {
    this.store = store;
    this.idGenerator = idGenerator;
    this.resourcesGenerator = resourcesGenerator;
  }

  /**
   * Creates a new pod, pre-populating it with the resources created by the data generator.
   * Pod identifiers are created based on the identifier generator.
   * Will throw an error if the given identifier already has a resource.
   */
  public async createPod(settings: PodSettings): Promise<ResourceIdentifier> {
    const podIdentifier = this.idGenerator.generate(settings.login);
    this.logger.info(`Creating pod ${podIdentifier.path}`);
    if (await this.store.resourceExists(podIdentifier)) {
      throw new ConflictHttpError(`There already is a resource at ${podIdentifier.path}`);
    }

    const count = await addGeneratedResources(podIdentifier, settings, this.resourcesGenerator, this.store);
    this.logger.info(`Added ${count} resources to ${podIdentifier.path}`);
    return podIdentifier;
  }
}
