import type { Credentials } from '../authentication/Credentials';
import type { CredentialsExtractor } from '../authentication/CredentialsExtractor';
import type { PermissionReader } from '../authorization/PermissionReader';
import type { AclPermissionSet } from '../authorization/permissions/AclPermissionSet';
import { AclMode } from '../authorization/permissions/AclPermissionSet';
import type { ModesExtractor } from '../authorization/permissions/ModesExtractor';
import { AccessMode } from '../authorization/permissions/Permissions';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import type { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import { getLoggerFor } from '../logging/LogUtil';
import { ACL, AUTH } from '../util/Vocabularies';
import type { OperationHttpHandlerInput } from './OperationHttpHandler';
import { OperationHttpHandler } from './OperationHttpHandler';

const VALID_METHODS = new Set([ 'HEAD', 'GET' ]);
const VALID_ACL_MODES = new Set([ AccessMode.read, AccessMode.write, AccessMode.append, AclMode.control ]);

export interface WacAllowHttpHandlerArgs {
  credentialsExtractor: CredentialsExtractor;
  modesExtractor: ModesExtractor;
  permissionReader: PermissionReader;
  operationHandler: OperationHttpHandler;
}

/**
 * Adds all the available permissions to the response metadata,
 * which can be used to generate the correct WAC-Allow header.
 *
 * This class does many things similar to the {@link AuthorizingHttpHandler},
 * so in general it is a good idea to make sure all these classes cache their results.
 */
export class WacAllowHttpHandler extends OperationHttpHandler {
  private readonly logger = getLoggerFor(this);

  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly modesExtractor: ModesExtractor;
  private readonly permissionReader: PermissionReader;
  private readonly operationHandler: OperationHttpHandler;

  public constructor(args: WacAllowHttpHandlerArgs) {
    super();
    this.credentialsExtractor = args.credentialsExtractor;
    this.modesExtractor = args.modesExtractor;
    this.permissionReader = args.permissionReader;
    this.operationHandler = args.operationHandler;
  }

  public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const { request, operation } = input;
    const response = await this.operationHandler.handleSafe(input);
    const { metadata } = response;

    // WAC-Allow is only needed for HEAD/GET requests
    if (!VALID_METHODS.has(operation.method) || !metadata) {
      return response;
    }

    this.logger.debug('Determining available permissions.');
    const credentials: Credentials = await this.credentialsExtractor.handleSafe(request);
    const requestedModes = await this.modesExtractor.handleSafe(operation);
    const availablePermissions = await this.permissionReader.handleSafe({ credentials, requestedModes });

    const permissionSet = availablePermissions.get(operation.target);
    if (permissionSet) {
      const user: AclPermissionSet = permissionSet;
      let everyone: AclPermissionSet;
      if (!credentials.agent?.webId) {
        // User is not authenticated so public permissions are the same as agent permissions
        this.logger.debug('User is not authenticated so has public permissions');
        everyone = user;
      } else {
        // Need to determine public permissions
        this.logger.debug('Determining public permissions');
        const permissionMap = await this.permissionReader.handleSafe({ credentials: {}, requestedModes });
        everyone = permissionMap.get(operation.target) ?? {};
      }

      this.logger.debug('Adding WAC-Allow metadata');
      this.addWacAllowMetadata(metadata, everyone, user);
    }

    return response;
  }

  /**
   * Converts the found permissions to triples and puts them in the metadata.
   */
  private addWacAllowMetadata(metadata: RepresentationMetadata, everyone: AclPermissionSet, user: AclPermissionSet):
  void {
    const modes = new Set<AccessMode>([ ...Object.keys(user), ...Object.keys(everyone) ] as AccessMode[]);
    for (const mode of modes) {
      if (VALID_ACL_MODES.has(mode)) {
        const capitalizedMode = mode.charAt(0).toUpperCase() + mode.slice(1) as 'Read' | 'Write' | 'Append' | 'Control';
        if (everyone[mode]) {
          metadata.add(AUTH.terms.publicMode, ACL.terms[capitalizedMode]);
        }
        if (user[mode]) {
          metadata.add(AUTH.terms.userMode, ACL.terms[capitalizedMode]);
        }
      }
    }
  }
}
