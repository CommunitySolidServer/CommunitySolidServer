import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { KeyValueStorage } from '../storage/keyvalue/KeyValueStorage';
import type { ResourceStore } from '../storage/ResourceStore';
import type { EventBus, EventConsumer } from '../util/messaging/EventBus';
import { addGeneratedResources } from './generate/GenerateUtil';
import type { PodGenerator } from './generate/PodGenerator';
import type { ResourcesGenerator } from './generate/ResourcesGenerator';
import type { PodManager } from './PodManager';
import type { PodSettings } from './settings/PodSettings';

const configPodChangeTopic = 'signaling.pods.configManager';

enum ConfigPodChangeType {
  create
}

export interface ConfigPodChange {
  type: ConfigPodChangeType;
  identifier: ResourceIdentifier;
  settings: PodSettings;
}

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
export class ConfigPodManager implements PodManager, EventConsumer<ConfigPodChange> {
  protected readonly logger = getLoggerFor(this);
  private readonly podGenerator: PodGenerator;
  private readonly routingStorage: KeyValueStorage<string, ResourceStore>;
  private readonly resourcesGenerator: ResourcesGenerator;
  private readonly store: ResourceStore;
  private readonly eventBus: EventBus<ConfigPodChange> | undefined;

  /**
   * @param podGenerator - Generator for the pod stores.
   * @param resourcesGenerator - Generator for the pod resources.
   * @param routingStorage - Where to store the generated pods, so they can be routed to.
   * @param store - The default ResourceStore
   * @param eventBus - (optional) The event bus used for signaling config pod changes,
   *                   only required in a multithreaded setup.
   */
  public constructor(podGenerator: PodGenerator, resourcesGenerator: ResourcesGenerator,
    routingStorage: KeyValueStorage<string, ResourceStore>, store: ResourceStore,
    eventBus?: EventBus<ConfigPodChange>) {
    this.podGenerator = podGenerator;
    this.routingStorage = routingStorage;
    this.resourcesGenerator = resourcesGenerator;
    this.store = store;
    this.eventBus = eventBus;
  }

  public async createPod(identifier: ResourceIdentifier, settings: PodSettings): Promise<void> {
    this.logger.info(`Creating pod ${identifier.path}`);

    // Will error in case there already is a store for the given identifier
    const store = await this.podGenerator.generate(identifier, settings);

    await this.routingStorage.set(identifier.path, store);
    const count = await addGeneratedResources(identifier, settings, this.resourcesGenerator, this.store);

    this.logger.info(`Added ${count} resources to ${identifier.path}`);

    // If an eventBus was provided, subscribe to config pod changes
    await this.eventBus?.subscribe(configPodChangeTopic, this);

    // If an eventBus was provided, notify potential listeners of this config pod change.
    await this.eventBus?.publish(configPodChangeTopic, {
      type: ConfigPodChangeType.create,
      identifier,
      settings,
    });
  }

  // Handler for on config pod changes
  public async onEvent(event: ConfigPodChange): Promise<void> {
    // When receiving a pod create event, check if a pod with the specified identifier exits in the routingStorage.
    if (event.type === ConfigPodChangeType.create && !await this.routingStorage.has(event.identifier.path)) {
      // If not, create the pod on this instance.
      await this.createPod(event.identifier, event.settings);
    }
  }
}
