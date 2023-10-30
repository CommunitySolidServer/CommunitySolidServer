import type { AuxiliaryStrategy } from '../http/auxiliary/AuxiliaryStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { IdentifierSetMultiMap } from '../util/map/IdentifierMap';
import type { MapEntry } from '../util/map/MapUtil';
import { modify } from '../util/map/MapUtil';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import { AclMode } from './permissions/AclPermissionSet';
import type { AclPermissionSet } from './permissions/AclPermissionSet';
import type { AccessMap, AccessMode, PermissionMap, PermissionSet } from './permissions/Permissions';

/**
 * Determines the permission for authorization resources (such as ACL or ACR).
 * In contrast to the regular resource mechanism, read/write access to authorization resources
 * is obtained by setting Control permissions on the corresponding subject resource
 * rather than directly setting permissions for the authorization resource itself.
 * Hence, this class transforms Control permissions on the subject resource
 * to Read/Write permissions on the authorization resource.
 */
export class AuthAuxiliaryReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly reader: PermissionReader;
  private readonly authStrategy: AuxiliaryStrategy;

  public constructor(reader: PermissionReader, authStrategy: AuxiliaryStrategy) {
    super();
    this.reader = reader;
    this.authStrategy = authStrategy;
  }

  public async handle({ requestedModes, credentials }: PermissionReaderInput): Promise<PermissionMap> {
    // Finds all the ACL identifiers
    const authMap = new Map(this.findAuth(requestedModes));

    // Replaces the ACL identifies with the corresponding subject identifiers
    const updatedMap = modify(
      new IdentifierSetMultiMap(requestedModes),
      { add: authMap.values(), remove: authMap.keys() },
    );
    const result = await this.reader.handleSafe({ requestedModes: updatedMap, credentials });

    // Extracts the permissions based on the subject control permissions
    for (const [ identifier, [ subject ]] of authMap) {
      this.logger.debug(`Mapping ${subject.path} control permission to all permissions for ${identifier.path}`);
      result.set(identifier, this.interpretControl(identifier, result.get(subject)));
    }
    return result;
  }

  /**
   * Finds all authorization resource identifiers and maps them to their subject identifier and the requested modes.
   */
  private* findAuth(accessMap: AccessMap): Iterable<[ResourceIdentifier, MapEntry<AccessMap>]> {
    for (const [ identifier ] of accessMap) {
      if (this.authStrategy.isAuxiliaryIdentifier(identifier)) {
        const subject = this.authStrategy.getSubjectIdentifier(identifier);
        // Unfortunately there is no enum inheritance so we have to cast like this
        yield [ identifier, [ subject, new Set([ AclMode.control ] as unknown as AccessMode[]) ]];
      }
    }
  }

  /**
   * Updates the permissions for an authorization resource
   * by interpreting the Control access mode as allowing full access.
   */
  protected interpretControl(identifier: ResourceIdentifier, permissionSet: AclPermissionSet = {}): PermissionSet {
    const { control } = permissionSet;
    return {
      read: control,
      append: control,
      write: control,
      control,
    } as AclPermissionSet;
  }
}
