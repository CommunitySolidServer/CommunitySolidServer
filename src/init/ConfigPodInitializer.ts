import { getLoggerFor } from '../logging/LogUtil';
import type { ComponentsJsFactory } from '../pods/generate/ComponentsJsFactory';
import { TEMPLATE, TEMPLATE_VARIABLE } from '../pods/generate/variables/Variables';
import type { KeyValueStorage } from '../storage/keyvalue/KeyValueStorage';
import type { ResourceStore } from '../storage/ResourceStore';
import { Initializer } from './Initializer';

/**
 * Initializes all pods that have been stored and loads them in memory.
 * This reads the pod settings from a permanent storage and uses those
 * to create the corresponding ResourceStores in memory,
 * so this is required every time the server starts.
 *
 * Part of the dynamic pod creation.
 * Reads the contents from the configuration storage, uses those values to instantiate ResourceStores,
 * and then adds them to the routing storage.
 *
 * @see {@link ConfigPodManager}, {@link TemplatedPodGenerator}, {@link BaseUrlRouterRule}
 */
export class ConfigPodInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);
  private readonly storeFactory: ComponentsJsFactory;
  private readonly configStorage: KeyValueStorage<string, unknown>;
  private readonly routingStorage: KeyValueStorage<string, ResourceStore>;

  public constructor(
    storeFactory: ComponentsJsFactory,
    configStorage: KeyValueStorage<string, unknown>,
    routingStorage: KeyValueStorage<string, ResourceStore>,
  ) {
    super();
    this.storeFactory = storeFactory;
    this.configStorage = configStorage;
    this.routingStorage = routingStorage;
  }

  public async handle(): Promise<void> {
    let count = 0;
    for await (const [ path, value ] of this.configStorage.entries()) {
      const config = value as NodeJS.Dict<string>;
      const store: ResourceStore =
        await this.storeFactory.generate(config[TEMPLATE_VARIABLE.templateConfig]!, TEMPLATE.ResourceStore, config);
      await this.routingStorage.set(path, store);
      this.logger.debug(`Initialized pod at ${path}`);
      count += 1;
    }
    this.logger.info(`Initialized ${count} dynamic pods.`);
  }
}
