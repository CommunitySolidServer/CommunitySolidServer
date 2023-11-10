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
  private readonly store: ResourceStore;

  /**
   * @param podGenerator - Generator for the pod stores.
   * @param resourcesGenerator - Generator for the pod resources.
   * @param routingStorage - Where to store the generated pods so they can be routed to.
   * @param store - The default ResourceStore
   */
  public constructor(
    podGenerator: PodGenerator,
    resourcesGenerator: ResourcesGenerator,
    routingStorage: KeyValueStorage<string, ResourceStore>,
    store: ResourceStore,
  ) {
    this.podGenerator = podGenerator;
    this.routingStorage = routingStorage;
    this.resourcesGenerator = resourcesGenerator;
    this.store = store;
  }

  public async createPod(settings: PodSettings): Promise<void> {
    this.logger.info(`Creating pod ${settings.base.path}`);

    // Will error in case there already is a store for the given identifier
    const store = await this.podGenerator.generate(settings);

    await this.routingStorage.set(settings.base.path, store);
    const count = await addGeneratedResources(settings, this.resourcesGenerator, this.store);

    this.logger.info(`Added ${count} resources to ${settings.base.path}`);
  }
}
