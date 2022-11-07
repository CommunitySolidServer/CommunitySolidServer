import type { Operation } from '../../http/Operation';
import type { ResourceSet } from '../../storage/ResourceSet';
import { ModesExtractor } from './ModesExtractor';
import type { AccessMap } from './Permissions';
import { AccessMode } from './Permissions';

/**
 * Adds the `create` access mode to the result of the source in case the target resource does not exist.
 */
export class CreateModesExtractor extends ModesExtractor {
  private readonly source: ModesExtractor;
  private readonly resourceSet: ResourceSet;

  public constructor(source: ModesExtractor, resourceSet: ResourceSet) {
    super();
    this.source = source;
    this.resourceSet = resourceSet;
  }

  public async canHandle(operation: Operation): Promise<void> {
    await this.source.canHandle(operation);
  }

  public async handle(operation: Operation): Promise<AccessMap> {
    const accessMap = await this.source.handle(operation);

    if (!accessMap.hasEntry(operation.target, AccessMode.create) &&
      !await this.resourceSet.hasResource(operation.target)) {
      accessMap.add(operation.target, AccessMode.create);
    }

    return accessMap;
  }
}
