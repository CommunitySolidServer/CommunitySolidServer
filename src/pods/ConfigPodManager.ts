import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { KeyValueStorage } from '../storage/keyvalue/KeyValueStorage';
import type { ResourceStore } from '../storage/ResourceStore';
import { addGeneratedResources } from './generate/GenerateUtil';
import type { PodGenerator } from './generate/PodGenerator';
import type { ResourcesGenerator } from './generate/ResourcesGenerator';
import type { PodManager } from './PodManager';
import type { PodSettings } from './settings/PodSettings';

/**
 * Pod manager that creates a store for the pod with a {@link PodGenerator}
 * and fills it with resources from a {@link ResourcesGenerator}.
 *
 * Part of the dynamic pod creation.
 *  1. Calls a PodGenerator to instantiate a new resource store for the pod.
 *  2. Generates the pod resources based on the templates as usual.
 *  3. Adds the created pod to the routing storage, which is used for linking pod identifiers to their resource stores.
 *
 * @see {@link TemplatedPodGenerator}, {@link ConfigPodInitializer}, {@link BaseUrlRouterRule}
 */
export class ConfigPodManager implements PodManager {
  protected readonly logger = getLoggerFor(this);
  private readonly podGenerator: PodGenerator;
  private readonly routingStorage: KeyValueStorage<string, ResourceStore>;
  private readonly resourcesGenerator: ResourcesGenerator;

  /**
   * @param podGenerator - Generator for the pod stores.
   * @param resourcesGenerator - Generator for the pod resources.
   * @param routingStorage - Where to store the generated pods so they can be routed to.
   */
  public constructor(podGenerator: PodGenerator, resourcesGenerator: ResourcesGenerator,
    routingStorage: KeyValueStorage<string, ResourceStore>) {
    this.podGenerator = podGenerator;
    this.routingStorage = routingStorage;
    this.resourcesGenerator = resourcesGenerator;
  }

  public async createPod(identifier: ResourceIdentifier, settings: PodSettings): Promise<void> {
    this.logger.info(`Creating pod ${identifier.path}`);

    // Will error in case there already is a store for the given identifier
    const store = await this.podGenerator.generate(identifier, settings);

    const count = await addGeneratedResources(identifier, settings, this.resourcesGenerator, store);
    this.logger.info(`Added ${count} resources to ${identifier.path}`);

    await this.routingStorage.set(identifier.path, store);
  }
}
