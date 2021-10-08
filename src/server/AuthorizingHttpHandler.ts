import type { CredentialSet } from '../authentication/Credentials';
import type { CredentialsExtractor } from '../authentication/CredentialsExtractor';
import type { Authorizer } from '../authorization/Authorizer';
import type { PermissionReader } from '../authorization/PermissionReader';
import type { ModesExtractor } from '../authorization/permissions/ModesExtractor';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import { getLoggerFor } from '../logging/LogUtil';
import type { OperationHttpHandlerInput } from './OperationHttpHandler';
import { OperationHttpHandler } from './OperationHttpHandler';

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

  public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription | undefined> {
    const { request, operation } = input;
    const credentials: CredentialSet = await this.credentialsExtractor.handleSafe(request);
    this.logger.verbose(`Extracted credentials: ${JSON.stringify(credentials)}`);

    const modes = await this.modesExtractor.handleSafe(operation);
    this.logger.verbose(`Required modes are read: ${[ ...modes ].join(',')}`);

    const permissionSet = await this.permissionReader.handleSafe({ credentials, identifier: operation.target });
    this.logger.verbose(`Available permissions are ${JSON.stringify(permissionSet)}`);

    try {
      await this.authorizer.handleSafe({ credentials, identifier: operation.target, modes, permissionSet });
      operation.permissionSet = permissionSet;
    } catch (error: unknown) {
      this.logger.verbose(`Authorization failed: ${(error as any).message}`);
      throw error;
    }

    this.logger.verbose(`Authorization succeeded, calling source handler`);

    return this.operationHandler.handleSafe(input);
  }
}
