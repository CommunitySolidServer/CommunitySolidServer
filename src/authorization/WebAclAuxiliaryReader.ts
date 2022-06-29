import type { CredentialGroup } from '../authentication/Credentials';
import type { AuxiliaryStrategy } from '../http/auxiliary/AuxiliaryStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { IdentifierSetMultiMap } from '../util/map/IdentifierMap';
import type { MapEntry } from '../util/map/MapUtil';
import { modify } from '../util/map/MapUtil';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import { AclMode } from './permissions/AclPermission';
import type { AclPermission } from './permissions/AclPermission';
import type { AccessMap, AccessMode, PermissionMap, PermissionSet } from './permissions/Permissions';

/**
 * Determines the permission for ACL auxiliary resources.
 * This is done by looking for control permissions on the subject resource.
 */
export class WebAclAuxiliaryReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly reader: PermissionReader;
  private readonly aclStrategy: AuxiliaryStrategy;

  public constructor(reader: PermissionReader, aclStrategy: AuxiliaryStrategy) {
    super();
    this.reader = reader;
    this.aclStrategy = aclStrategy;
  }

  public async handle({ requestedModes, credentials }: PermissionReaderInput): Promise<PermissionMap> {
    // Finds all the ACL identifiers
    const aclMap = new Map(this.findAcl(requestedModes));

    // Replaces the ACL identifies with the corresponding subject identifiers
    const updatedMap = modify(new IdentifierSetMultiMap(requestedModes),
      { add: aclMap.values(), remove: aclMap.keys() });
    const result = await this.reader.handleSafe({ requestedModes: updatedMap, credentials });

    // Extracts the ACL permissions based on the subject control permissions
    for (const [ identifier, [ subject ]] of aclMap) {
      this.logger.debug(`Mapping ${subject.path} control permission to all permissions for ${identifier.path}`);
      result.set(identifier, this.interpretControl(identifier, result.get(subject)));
    }
    return result;
  }

  /**
   * Finds all ACL identifiers and maps them to their subject identifier and the requested modes.
   */
  private* findAcl(accessMap: AccessMap): Iterable<[ResourceIdentifier, MapEntry<AccessMap>]> {
    for (const [ identifier ] of accessMap) {
      if (this.aclStrategy.isAuxiliaryIdentifier(identifier)) {
        const subject = this.aclStrategy.getSubjectIdentifier(identifier);
        // Unfortunately there is no enum inheritance so we have to cast like this
        yield [ identifier, [ subject, new Set([ AclMode.control ] as unknown as AccessMode[]) ]];
      }
    }
  }

  /**
   * Updates the permissions for an ACL resource by interpreting the Control access mode as allowing full access.
   */
  protected interpretControl(identifier: ResourceIdentifier, permissionSet: PermissionSet = {}): PermissionSet {
    const aclSet: PermissionSet = {};
    for (const [ group, permissions ] of Object.entries(permissionSet) as [ CredentialGroup, AclPermission ][]) {
      const { control } = permissions;
      aclSet[group] = {
        read: control,
        append: control,
        write: control,
        control,
      } as AclPermission;
    }
    return aclSet;
  }
}
