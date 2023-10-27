import { DataFactory } from 'n3';
import type { Credentials } from '../authentication/Credentials';
import type { CredentialsExtractor } from '../authentication/CredentialsExtractor';
import type { Authorizer } from '../authorization/Authorizer';
import type { PermissionReader } from '../authorization/PermissionReader';
import type { ModesExtractor } from '../authorization/permissions/ModesExtractor';
import type { AccessMap } from '../authorization/permissions/Permissions';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { HttpError } from '../util/errors/HttpError';
import { SOLID_META } from '../util/Vocabularies';
import type { OperationHttpHandlerInput } from './OperationHttpHandler';
import { OperationHttpHandler } from './OperationHttpHandler';

const { blankNode, namedNode, literal } = DataFactory;

export interface AuthorizingHttpHandlerArgs {
  /**
   * Extracts the credentials from the incoming request.
   */
  credentialsExtractor: CredentialsExtractor;
  /**
   * Extracts the required modes from the generated Operation.
   */
  modesExtractor: ModesExtractor;
  /**
   * Reads the permissions available for the Operation.
   */
  permissionReader: PermissionReader;
  /**
   * Verifies if the requested operation is allowed.
   */
  authorizer: Authorizer;
  /**
   * Handler to call if the operation is authorized.
   */
  operationHandler: OperationHttpHandler;
}

/**
 * Handles all the necessary steps for an authorization.
 * Errors if authorization fails, otherwise passes the parameter to the operationHandler handler.
 * The following steps are executed:
 *  - Extracting credentials from the request.
 *  - Extracting the required permissions.
 *  - Reading the allowed permissions for the credentials.
 *  - Validating if this operation is allowed.
 */
export class AuthorizingHttpHandler extends OperationHttpHandler {
  private readonly logger = getLoggerFor(this);

  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly modesExtractor: ModesExtractor;
  private readonly permissionReader: PermissionReader;
  private readonly authorizer: Authorizer;
  private readonly operationHandler: OperationHttpHandler;

  public constructor(args: AuthorizingHttpHandlerArgs) {
    super();
    this.credentialsExtractor = args.credentialsExtractor;
    this.modesExtractor = args.modesExtractor;
    this.permissionReader = args.permissionReader;
    this.authorizer = args.authorizer;
    this.operationHandler = args.operationHandler;
  }

  public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const { request, operation } = input;
    const credentials: Credentials = await this.credentialsExtractor.handleSafe(request);
    this.logger.verbose(`Extracted credentials: ${JSON.stringify(credentials)}`);

    const requestedModes = await this.modesExtractor.handleSafe(operation);
    this.logger.verbose(`Retrieved required modes: ${
      [ ...requestedModes.entrySets() ]
        .map(([ id, set ]): string => `{ ${id.path}: ${[ ...set ].join(',')} }`).join(',')
    }`);

    const availablePermissions = await this.permissionReader.handleSafe({ credentials, requestedModes });
    this.logger.verbose(`Available permissions are ${
      [ ...availablePermissions.entries() ]
        .map(([ id, map ]): string => `{ ${id.path}: ${JSON.stringify(map)} }`).join(',')
    }`);

    try {
      await this.authorizer.handleSafe({ credentials, requestedModes, availablePermissions });
    } catch (error: unknown) {
      this.logger.verbose(`Authorization failed: ${createErrorMessage(error)}`);
      if (HttpError.isInstance(error)) {
        this.addAccessModesToError(error, requestedModes);
      }
      throw error;
    }

    this.logger.verbose(`Authorization succeeded, calling source handler`);

    return this.operationHandler.handleSafe(input);
  }

  private addAccessModesToError(error: HttpError, requestedModes: AccessMap): void {
    for (const [ identifier, modes ] of requestedModes.entrySets()) {
      const bnode = blankNode();
      error.metadata.add(SOLID_META.terms.requestedAccess, bnode);
      error.metadata.addQuad(bnode, SOLID_META.terms.accessTarget, namedNode(identifier.path));
      for (const mode of modes.values()) {
        error.metadata.addQuad(bnode, SOLID_META.terms.accessMode, literal(mode));
      }
    }
  }
}
