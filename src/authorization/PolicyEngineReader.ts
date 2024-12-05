import type { Credentials, PolicyEngine } from '@solidlab/policy-engine';
import { ACL, PERMISSIONS } from '@solidlab/policy-engine';
import { getLoggerFor } from 'global-logger-factory';
import { InternalServerError } from '../util/errors/InternalServerError';
import { IdentifierMap } from '../util/map/IdentifierMap';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import { AclMode } from './permissions/AclPermissionSet';
import type { MultiPermissionMap } from './permissions/Permissions';
import { AccessMode } from './permissions/Permissions';

const conversionMap: Record<string, AccessMode | AclMode> = {
  [PERMISSIONS.Read]: AccessMode.read,
  [PERMISSIONS.Append]: AccessMode.append,
  [PERMISSIONS.Modify]: AccessMode.write,
  [PERMISSIONS.Delete]: AccessMode.delete,
  [PERMISSIONS.Create]: AccessMode.create,
  [ACL.Read]: AccessMode.read,
  [ACL.Append]: AccessMode.append,
  [ACL.Write]: AccessMode.write,
  [ACL.Control]: AclMode.control,
} as const;

/**
 * A {@link PermissionReader} that uses a {@link PolicyEngine} to determine the available permissions.
 */
export class PolicyEngineReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  protected readonly engine: PolicyEngine;

  public constructor(engine: PolicyEngine) {
    super();
    this.engine = engine;
  }

  public async handle(input: PermissionReaderInput): Promise<MultiPermissionMap> {
    const credentials: Credentials = {
      agent: input.credentials.agent?.webId,
      client: input.credentials.client?.clientId,
      issuer: input.credentials.issuer?.url,
    };

    const result: MultiPermissionMap = new IdentifierMap();
    for (const identifier of input.requestedModes.distinctKeys()) {
      const permissions = await this.engine.getPermissions(
        identifier.path,
        credentials,
        [ ...input.requestedModes.get(identifier)! ].map(this.fromAccessMode.bind(this)),
      );
      const accessModePermissions = Object.fromEntries(
        Object.entries(permissions)
          .map(([ key, val ]): [AccessMode | AclMode, boolean] => [ this.toAccessMode(key), val ]),
      );
      result.set(identifier, accessModePermissions);
    }

    return result;
  }

  protected fromAccessMode(mode: AccessMode | AclMode): string {
    for (const [ perm, acc ] of Object.entries(conversionMap)) {
      if (acc === mode) {
        return perm;
      }
    }
    throw new InternalServerError(`Unknown access mode ${mode}`);
  }

  protected toAccessMode(permission: string): AccessMode | AclMode {
    const result = conversionMap[permission];
    if (!result) {
      throw new InternalServerError(`Unknown permission ${permission}`);
    }
    return result;
  }
}
