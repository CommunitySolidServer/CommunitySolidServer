import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { ResourceStore } from '../ResourceStore';
import type { PreferenceSupport } from './PreferenceSupport';
import { RouterRule } from './RouterRule';

export interface ConvertingStoreEntry {
  store: ResourceStore;
  supportChecker: PreferenceSupport;
}

/**
 * Rule that directs requests based on how the data would need to be converted.
 * In case the given converter can convert the data to the requested type,
 * it will be directed to the `convertStore`.
 * Otherwise the `defaultStore` will be chosen.
 *
 * In case there is no data and only an identifier the `defaultStore` will be checked
 * if it contains the given identifier.
 * If not, the `convertStore` will be returned.
 */
export class ConvertingRouterRule extends RouterRule {
  private readonly typedStores: ConvertingStoreEntry[];
  private readonly defaultStore: ResourceStore;

  public constructor(typedStores: ConvertingStoreEntry[], defaultStore: ResourceStore) {
    super();
    this.typedStores = typedStores;
    this.defaultStore = defaultStore;
  }

  public async handle(input: { identifier: ResourceIdentifier; representation?: Representation }):
  Promise<ResourceStore> {
    const { identifier, representation } = input;
    let store: ResourceStore;
    if (representation) {
      // TS type checking is not smart enough to let us reuse the input object
      store = await this.findStore(async(entry): Promise<boolean> =>
        entry.supportChecker.supports({ identifier, representation }));
    } else {
      // No content-type given so we can only check if one of the stores has data for the identifier
      store = await this.findStore(async(entry): Promise<boolean> => entry.store.hasResource(identifier));
    }
    return store;
  }

  /**
   * Helper function that runs the given callback function for all the stores
   * and returns the first one that does not throw an error.
   *
   * Returns the default store if no match was found.
   */
  private async findStore(supports: (entry: ConvertingStoreEntry) => Promise<boolean>): Promise<ResourceStore> {
    // Try all the stores, return default if there is no match
    for (const entry of this.typedStores) {
      if (await supports(entry)) {
        return entry.store;
      }
    }
    return this.defaultStore;
  }
}
