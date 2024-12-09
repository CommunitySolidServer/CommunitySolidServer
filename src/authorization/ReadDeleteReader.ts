import { PERMISSIONS } from '@solidlab/policy-engine';
import type { ResourceSet } from '../storage/ResourceSet';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { IdentifierSetMultiMap } from '../util/map/IdentifierMap';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { MultiPermissionMap } from './permissions/Permissions';

/**
 * When trying to delete a non-existent resource, the server needs to return a different result
 * based on the read permissions on the resource or its parent container.
 * This {@link PermissionReader} makes sure read permissions on a resource and its parent container
 * are checked in such cases.
 */
export class ReadDeleteReader extends PermissionReader {
  protected readonly source: PermissionReader;
  protected readonly resourceSet: ResourceSet;
  protected readonly identifierStrategy: IdentifierStrategy;

  public constructor(source: PermissionReader, resourceSet: ResourceSet, identifierStrategy: IdentifierStrategy) {
    super();
    this.source = source;
    this.resourceSet = resourceSet;
    this.identifierStrategy = identifierStrategy;
  }

  public async canHandle(input: PermissionReaderInput): Promise<void> {
    return this.source.canHandle(input);
  }

  public async handle(input: PermissionReaderInput): Promise<MultiPermissionMap> {
    const requestedModes = new IdentifierSetMultiMap(input.requestedModes);
    for (const identifier of requestedModes.distinctKeys()) {
      if (requestedModes.hasEntry(identifier, PERMISSIONS.Delete) && !await this.resourceSet.hasResource(identifier)) {
        requestedModes.add(identifier, PERMISSIONS.Read);
        if (!this.identifierStrategy.isRootContainer(identifier)) {
          const parent = this.identifierStrategy.getParentContainer(identifier);
          requestedModes.add(parent, PERMISSIONS.Read);
        }
      }
    }
    return this.source.handle({ ...input, requestedModes });
  }
}
