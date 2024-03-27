import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { IdentifierMap, IdentifierSetMultiMap } from '../util/map/IdentifierMap';
import type { MapEntry } from '../util/map/MapUtil';
import { modify } from '../util/map/MapUtil';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { AccessMap, PermissionMap, PermissionSet } from './permissions/Permissions';
import { AccessMode } from './permissions/Permissions';

/**
 * Determines `delete` and `create` permissions for those resources that need it
 * by making sure the parent container has the required permissions.
 *
 * Create requires `append` permissions on the parent container.
 * Delete requires `write` permissions on both the parent container and the resource itself.
 */
export class ParentContainerReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly reader: PermissionReader;
  private readonly identifierStrategy: IdentifierStrategy;

  public constructor(reader: PermissionReader, identifierStrategy: IdentifierStrategy) {
    super();
    this.reader = reader;
    this.identifierStrategy = identifierStrategy;
  }

  public async handle({ requestedModes, credentials }: PermissionReaderInput): Promise<PermissionMap> {
    // Finds the entries for which we require parent container permissions
    const containerMap = this.findParents(requestedModes);

    // Merges the necessary parent container modes with the already requested modes
    const combinedModes = modify(new IdentifierSetMultiMap(requestedModes), { add: containerMap.values() });
    const result = await this.reader.handleSafe({ requestedModes: combinedModes, credentials });

    // Updates the create/delete permissions based on the parent container permissions
    for (const [ identifier, [ container ]] of containerMap) {
      this.logger.debug(`Determining ${identifier.path} create and delete permissions based on ${container.path}`);
      result.set(identifier, this.addContainerPermissions(result.get(identifier), result.get(container)));
    }
    return result;
  }

  /**
   * Finds the identifiers for which we need parent permissions.
   * Values are the parent identifier and the permissions they need.
   */
  private findParents(requestedModes: AccessMap): IdentifierMap<MapEntry<AccessMap>> {
    const containerMap = new IdentifierMap<[ResourceIdentifier, Set<AccessMode>]>();
    for (const [ identifier, modes ] of requestedModes.entrySets()) {
      if (modes.has(AccessMode.create) || modes.has(AccessMode.delete)) {
        const container = this.identifierStrategy.getParentContainer(identifier);
        containerMap.set(identifier, [ container, this.getParentModes(modes) ]);
      }
    }
    return containerMap;
  }

  /**
   * Determines which permissions are required on the parent container.
   */
  private getParentModes(modes: ReadonlySet<AccessMode>): Set<AccessMode> {
    const containerModes: Set<AccessMode> = new Set();
    if (modes.has(AccessMode.create)) {
      containerModes.add(AccessMode.append);
    }
    if (modes.has(AccessMode.delete)) {
      containerModes.add(AccessMode.write);
    }
    return containerModes;
  }

  /**
   * Merges the container permission set into the resource permission set
   * based on the parent container rules for create/delete permissions.
   */
  private addContainerPermissions(resourceSet?: PermissionSet, containerSet?: PermissionSet): PermissionSet {
    resourceSet = resourceSet ?? {};
    containerSet = containerSet ?? {};

    return this.interpretContainerPermission(resourceSet, containerSet);
  }

  /**
   * Determines the create and delete permissions for the given resource permissions
   * based on those of its parent container.
   */
  private interpretContainerPermission(resourcePermission: PermissionSet, containerPermission: PermissionSet):
  PermissionSet {
    const mergedPermission = { ...resourcePermission };

    // https://solidproject.org/TR/2021/wac-20210711:
    // When an operation requests to create a resource as a member of a container resource,
    // the server MUST match an Authorization allowing the acl:Append or acl:Write access privilege
    // on the container for new members.
    mergedPermission.create = containerPermission.append && resourcePermission.create !== false;

    // https://solidproject.org/TR/2021/wac-20210711:
    // When an operation requests to delete a resource,
    // the server MUST match Authorizations allowing the acl:Write access privilege
    // on the resource and the containing container.
    mergedPermission.delete =
      resourcePermission.write &&
      containerPermission.write &&
      resourcePermission.delete !== false;

    return mergedPermission;
  }
}
