import type { Operation } from '../../http/Operation';
import type { ResourceSet } from '../../storage/ResourceSet';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { ModesExtractor } from './ModesExtractor';
import type { AccessMap } from './Permissions';
import { AccessMode } from './Permissions';

/**
 * In case a resource is being deleted but does not exist,
 * the server response code depends on the access modes the agent has on the parent container.
 * In case the agent has read access on the parent container, a 404 should be returned,
 * otherwise it should be 401/403.
 *
 * This class adds support for this by requiring read access on the parent container
 * in case the target resource does not exist.
 */
export class DeleteParentExtractor extends ModesExtractor {
  private readonly source: ModesExtractor;
  private readonly resourceSet: ResourceSet;
  private readonly identifierStrategy: IdentifierStrategy;

  public constructor(source: ModesExtractor, resourceSet: ResourceSet, identifierStrategy: IdentifierStrategy) {
    super();
    this.source = source;
    this.resourceSet = resourceSet;
    this.identifierStrategy = identifierStrategy;
  }

  public async canHandle(operation: Operation): Promise<void> {
    await this.source.canHandle(operation);
  }

  public async handle(operation: Operation): Promise<AccessMap> {
    const accessMap = await this.source.handle(operation);
    const { target } = operation;
    if (accessMap.get(target)?.has(AccessMode.delete) &&
      !this.identifierStrategy.isRootContainer(target) &&
      !await this.resourceSet.hasResource(target)) {
      const parent = this.identifierStrategy.getParentContainer(target);
      accessMap.add(parent, new Set([ AccessMode.read ]));
    }
    return accessMap;
  }
}
