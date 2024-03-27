import type { Operation } from '../../http/Operation';
import type { ResourceSet } from '../../storage/ResourceSet';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { ModesExtractor } from './ModesExtractor';
import type { AccessMap } from './Permissions';
import { AccessMode } from './Permissions';

/**
 * Returns the required access modes from the source {@link ModesExtractor}.
 * In case create permissions are required,
 * verifies if any of the containers permissions also need to be created
 * and adds the corresponding identifier/mode combinations.
 */
export class IntermediateCreateExtractor extends ModesExtractor {
  private readonly resourceSet: ResourceSet;
  private readonly strategy: IdentifierStrategy;
  private readonly source: ModesExtractor;

  /**
   * Certain permissions depend on the existence of the target resource.
   * The provided {@link ResourceSet} will be used for that.
   *
   * @param resourceSet - {@link ResourceSet} that can verify the target resource existence.
   * @param strategy - {@link IdentifierStrategy} that will be used to determine parent containers.
   * @param source - The source {@link ModesExtractor}.
   */
  public constructor(resourceSet: ResourceSet, strategy: IdentifierStrategy, source: ModesExtractor) {
    super();
    this.resourceSet = resourceSet;
    this.strategy = strategy;
    this.source = source;
  }

  public async canHandle(input: Operation): Promise<void> {
    return this.source.canHandle(input);
  }

  public async handle(input: Operation): Promise<AccessMap> {
    const requestedModes = await this.source.handle(input);

    for (const key of requestedModes.distinctKeys()) {
      if (requestedModes.hasEntry(key, AccessMode.create)) {
        // Add the `create` mode if the parent does not exist yet
        const parent = this.strategy.getParentContainer(key);
        if (!await this.resourceSet.hasResource(parent)) {
          // It is not completely clear at this point which permissions need to be available
          // on intermediate containers to create them,
          // so we stick with `create` for now.
          requestedModes.add(parent, AccessMode.create);
        }
      }
    }

    return requestedModes;
  }
}
