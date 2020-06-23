import { Authorizer } from '../authorization/Authorizer';
import { Credentials } from '../authentication/Credentials';
import { CredentialsExtractor } from '../authentication/CredentialsExtractor';
import { HttpHandler } from '../server/HttpHandler';
import { HttpRequest } from '../server/HttpRequest';
import { HttpResponse } from '../server/HttpResponse';
import { Operation } from './operations/Operation';
import { OperationHandler } from './operations/OperationHandler';
import { PermissionSet } from './permissions/PermissionSet';
import { PermissionsExtractor } from './permissions/PermissionsExtractor';
import { RequestParser } from './http/RequestParser';
import { ResponseDescription } from './operations/ResponseDescription';
import { ResponseWriter } from './http/ResponseWriter';

/**
 * Collection of handlers needed for {@link AuthenticatedLdpHandler} to function.
 */
export interface AuthenticatedLdpHandlerArgs {
  /**
   * Parses the incoming requests.
   */
  requestParser: RequestParser;
  /**
   * Extracts the credentials from the incoming request.
   */
  credentialsExtractor: CredentialsExtractor;
  /**
   * Extracts the required permissions from the generated Operation.
   */
  permissionsExtractor: PermissionsExtractor;
  /**
   * Verifies if the requested operation is allowed.
   */
  authorizer: Authorizer;
  /**
   * Executed the operation.
   */
  operationHandler: OperationHandler;
  /**
   * Writes out the response of the operation.
   */
  responseWriter: ResponseWriter;
}

/**
 * The central manager that connects all the necessary handlers to go from an incoming request to an executed operation.
 */
export class AuthenticatedLdpHandler extends HttpHandler {
  private readonly requestParser: RequestParser;
  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly permissionsExtractor: PermissionsExtractor;
  private readonly authorizer: Authorizer;
  private readonly operationHandler: OperationHandler;
  private readonly responseWriter: ResponseWriter;

  /**
   * Creates the handler.
   * @param args - The handlers required. None of them are optional.
   */
  public constructor(args: AuthenticatedLdpHandlerArgs) {
    super();
    Object.assign(this, args);
  }

  /**
   * Checks if the incoming request can be handled. The check is very non-restrictive and will usually be true.
   * It is based on whether the incoming request can be parsed to an operation.
   * @param input - Incoming request and response. Only the request will be used.
   *
   * @returns A promise resolving if this request can be handled, otherwise rejecting with an Error.
   */
  public async canHandle(input: { request: HttpRequest; response: HttpResponse }): Promise<void> {
    return this.requestParser.canHandle(input.request);
  }

  /**
   * Handles the incoming request and writes out the response.
   * This includes the following steps:
   *  - Parsing the request to an Operation.
   *  - Extracting credentials from the request.
   *  - Extracting the required permissions.
   *  - Validating if this operation is allowed.
   *  - Executing the operation.
   *  - Writing out the response.
   * @param input - The incoming request and response object to write to.
   *
   * @returns A promise resolving when the handling is finished.
   */
  public async handle(input: { request: HttpRequest; response: HttpResponse }): Promise<void> {
    let err: Error;
    let description: ResponseDescription;

    try {
      description = await this.runHandlers(input.request);
    } catch (error) {
      err = error;
    }

    const writeData = { response: input.response, description, error: err };

    return this.responseWriter.handleSafe(writeData);
  }

  /**
   * Runs all handlers except writing the output to the response.
   * This because any errors thrown here have an impact on the response.
   * @param request - Incoming request.
   *
   * @returns A promise resolving to the generated Operation.
   */
  private async runHandlers(request: HttpRequest): Promise<ResponseDescription> {
    const op: Operation = await this.requestParser.handleSafe(request);
    const credentials: Credentials = await this.credentialsExtractor.handleSafe(request);
    const permissions: PermissionSet = await this.permissionsExtractor.handleSafe(op);
    await this.authorizer.handleSafe({ credentials, identifier: op.target, permissions });
    return this.operationHandler.handleSafe(op);
  }
}
