import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { KeyValueStorage } from '../keyvalue/KeyValueStorage';
import type { ResourceStore } from '../ResourceStore';
import { RouterRule } from './RouterRule';

/**
 * Routes requests based on their base url.
 * Checks if any of the stored base URLs match the request identifier.
 * If there are no matches the base store will be returned if one was configured.
 *
 * Part of the dynamic pod creation.
 * Uses the identifiers that were added to the routing storage.
 *
 * @see {@link TemplatedPodGenerator}, {@link ConfigPodInitializer}, {@link ConfigPodManager}
 */
export class BaseUrlRouterRule extends RouterRule {
  private readonly baseStore?: ResourceStore;
  private readonly stores: KeyValueStorage<string, ResourceStore>;

  public constructor(stores: KeyValueStorage<string, ResourceStore>, baseStore?: ResourceStore) {
    super();
    this.baseStore = baseStore;
    this.stores = stores;
  }

  public async handle({ identifier }: { identifier: ResourceIdentifier }): Promise<ResourceStore> {
    try {
      return await this.findStore(identifier);
    } catch (error: unknown) {
      if (this.baseStore) {
        return this.baseStore;
      }
      throw error;
    }
  }

  /**
   * Finds the store whose base url key is contained in the given identifier.
   */
  private async findStore(identifier: ResourceIdentifier): Promise<ResourceStore> {
    for await (const [ key, store ] of this.stores.entries()) {
      if (identifier.path.startsWith(key)) {
        return store;
      }
    }
    throw new NotFoundHttpError();
  }
}
