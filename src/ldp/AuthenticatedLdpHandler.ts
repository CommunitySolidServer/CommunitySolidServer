import type { CredentialSet } from '../authentication/Credentials';
import type { CredentialsExtractor } from '../authentication/CredentialsExtractor';
import type { Authorizer } from '../authorization/Authorizer';
import type { PermissionReader } from '../authorization/PermissionReader';
import { BaseHttpHandler } from '../server/BaseHttpHandler';
import type { BaseHttpHandlerArgs } from '../server/BaseHttpHandler';
import type { HttpHandlerInput } from '../server/HttpHandler';
import type { HttpRequest } from '../server/HttpRequest';
import type { ErrorHandler } from './http/ErrorHandler';
import type { RequestParser } from './http/RequestParser';
import type { ResponseDescription } from './http/response/ResponseDescription';
import type { ResponseWriter } from './http/ResponseWriter';
import type { OperationMetadataCollector } from './operations/metadata/OperationMetadataCollector';
import type { Operation } from './operations/Operation';
import type { OperationHandler } from './operations/OperationHandler';
import type { ModesExtractor } from './permissions/ModesExtractor';

export interface AuthenticatedLdpHandlerArgs extends BaseHttpHandlerArgs {
  // Workaround for https://github.com/LinkedSoftwareDependencies/Components-Generator.js/issues/73
  requestParser: RequestParser;
  errorHandler: ErrorHandler;
  responseWriter: ResponseWriter;
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
   * Executed the operation.
   */
  operationHandler: OperationHandler;
  /**
   * Generates generic operation metadata that is required for a response.
   */
  operationMetadataCollector: OperationMetadataCollector;
}

/**
 * The central manager that connects all the necessary handlers to go from an incoming request to an executed operation.
 */
export class AuthenticatedLdpHandler extends BaseHttpHandler {
  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly modesExtractor: ModesExtractor;
  private readonly permissionReader: PermissionReader;
  private readonly authorizer: Authorizer;
  private readonly operationHandler: OperationHandler;
  private readonly operationMetadataCollector: OperationMetadataCollector;

  /**
   * Creates the handler.
   * @param args - The handlers required. None of them are optional.
   */
  public constructor(args: AuthenticatedLdpHandlerArgs) {
    super(args);
    this.credentialsExtractor = args.credentialsExtractor;
    this.modesExtractor = args.modesExtractor;
    this.permissionReader = args.permissionReader;
    this.authorizer = args.authorizer;
    this.operationHandler = args.operationHandler;
    this.operationMetadataCollector = args.operationMetadataCollector;
  }

  /**
   * Checks if the incoming request can be handled. The check is very non-restrictive and will usually be true.
   * It is based on whether the incoming request can be parsed to an operation.
   * @param input - Incoming request and response. Only the request will be used.
   *
   * @returns A promise resolving if this request can be handled, otherwise rejecting with an Error.
   */
  public async canHandle(input: HttpHandlerInput): Promise<void> {
    return this.requestParser.canHandle(input.request);
  }

  /**
   * Handles the incoming operation and generates a response.
   * This includes the following steps:
   *  - Extracting credentials from the request.
   *  - Extracting the required permissions.
   *  - Validating if this operation is allowed.
   *  - Executing the operation.
   */
  protected async handleOperation(operation: Operation, request: HttpRequest): Promise<ResponseDescription> {
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

    this.logger.verbose(`Authorization succeeded, performing operation`);
    const response = await this.operationHandler.handleSafe(operation);

    if (response.metadata) {
      await this.operationMetadataCollector.handleSafe({ operation, metadata: response.metadata });
    }

    return response;
  }
}
