import type { Credentials, PolicyEngine } from '@solidlab/policy-engine';
import { getLoggerFor } from 'global-logger-factory';
import { IdentifierMap } from '../util/map/IdentifierMap';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { MultiPermissionMap } from './permissions/Permissions';

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
        [ ...input.requestedModes.get(identifier)! ],
      );
      result.set(identifier, permissions);
    }

    return result;
  }
}
