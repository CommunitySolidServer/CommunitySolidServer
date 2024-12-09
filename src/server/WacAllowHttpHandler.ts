import type { PermissionMap } from '@solidlab/policy-engine';
import { ACL, PERMISSIONS } from '@solidlab/policy-engine';
import { getLoggerFor } from 'global-logger-factory';
import type { VocabularyTerm } from 'rdf-vocabulary';
import type { Credentials } from '../authentication/Credentials';
import type { CredentialsExtractor } from '../authentication/CredentialsExtractor';
import type { PermissionReader } from '../authorization/PermissionReader';
import type { ModesExtractor } from '../authorization/permissions/ModesExtractor';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import type { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import { NotModifiedHttpError } from '../util/errors/NotModifiedHttpError';
import { AUTH } from '../util/Vocabularies';
import type { OperationHttpHandlerInput } from './OperationHttpHandler';
import { OperationHttpHandler } from './OperationHttpHandler';

const VALID_METHODS = new Set([ 'HEAD', 'GET' ]);

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
    let response: ResponseDescription | NotModifiedHttpError;
    try {
      response = await this.operationHandler.handleSafe(input);
    } catch (error: unknown) {
      // WAC-Allow headers need to be added to 304 responses
      // as the value can differ even if the representation is the same.
      if (NotModifiedHttpError.isInstance(error)) {
        response = error;
      } else {
        throw error;
      }
    }
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
      const user = permissionSet;
      let everyone: PermissionMap;
      if (credentials.agent?.webId) {
        // Need to determine public permissions
        this.logger.debug('Determining public permissions');
        // Note that this call can potentially create a new lock on a resource that is already locked,
        // so a locker that allows multiple read locks on the same resource is required.
        const permissionMap = await this.permissionReader.handleSafe({ credentials: {}, requestedModes });
        everyone = permissionMap.get(operation.target) ?? {};
      } else {
        // User is not authenticated so public permissions are the same as agent permissions
        this.logger.debug('User is not authenticated so has public permissions');
        everyone = user;
      }

      this.logger.debug('Adding WAC-Allow metadata');
      this.addWacAllowMetadata(metadata, everyone, user);
    }

    if (NotModifiedHttpError.isInstance(response)) {
      throw response;
    }

    return response;
  }

  /**
   * Converts the found permissions to triples and puts them in the metadata.
   */
  protected addWacAllowMetadata(metadata: RepresentationMetadata, everyone: PermissionMap, user: PermissionMap):
  void {
    const modes = new Set([ ...Object.keys(user), ...Object.keys(everyone) ]);
    for (const mode of modes) {
      const aclMode = this.toAclMode(mode);
      if (aclMode) {
        if (everyone[mode]) {
          metadata.add(AUTH.terms.publicMode, aclMode);
        }
        if (user[mode]) {
          metadata.add(AUTH.terms.userMode, aclMode);
        }
      }
    }
  }

  protected toAclMode(mode: string): VocabularyTerm<typeof ACL> | undefined {
    switch (mode) {
      case PERMISSIONS.Read: return ACL.terms.Read;
      case PERMISSIONS.Append: return ACL.terms.Append;
      case PERMISSIONS.Modify: return ACL.terms.Write;
      case ACL.Control: return ACL.terms.Control;
      default:
    }
  }
}
