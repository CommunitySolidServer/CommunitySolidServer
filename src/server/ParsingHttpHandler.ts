import type { PreferenceParser } from '../http/input/preferences/PreferenceParser';
import type { RequestParser } from '../http/input/RequestParser';
import type { OperationMetadataCollector } from '../http/ldp/metadata/OperationMetadataCollector';
import type { ErrorHandler } from '../http/output/error/ErrorHandler';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import type { ResponseWriter } from '../http/output/ResponseWriter';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import { getLoggerFor } from '../logging/LogUtil';
import { assertError } from '../util/errors/ErrorUtil';
import { HttpError } from '../util/errors/HttpError';
import type { HttpHandlerInput } from './HttpHandler';
import { HttpHandler } from './HttpHandler';
import type { HttpRequest } from './HttpRequest';
import type { HttpResponse } from './HttpResponse';
import type { OperationHttpHandler } from './OperationHttpHandler';

export interface ParsingHttpHandlerArgs {
  /**
   * Parses the requested preferences.
   */
  preferenceParser: PreferenceParser;
  /**
   * Parses the incoming requests.
   */
  requestParser: RequestParser;
  /**
   * Generates generic operation metadata that is required for a response.
   */
  metadataCollector: OperationMetadataCollector;
  /**
   * Converts errors to a serializable format.
   */
  errorHandler: ErrorHandler;
  /**
   * Writes out the response of the operation.
   */
  responseWriter: ResponseWriter;
  /**
   * Handler to send the operation to.
   */
  operationHandler: OperationHttpHandler;
}

/**
 * Parses requests and sends the resulting {@link Operation} to the wrapped {@link OperationHttpHandler}.
 * Errors are caught and handled by the {@link ErrorHandler}.
 * In case the {@link OperationHttpHandler} returns a result it will be sent to the {@link ResponseWriter}.
 */
export class ParsingHttpHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);

  private readonly preferenceParser: PreferenceParser;
  private readonly requestParser: RequestParser;
  private readonly errorHandler: ErrorHandler;
  private readonly responseWriter: ResponseWriter;
  private readonly metadataCollector: OperationMetadataCollector;
  private readonly operationHandler: OperationHttpHandler;

  public constructor(args: ParsingHttpHandlerArgs) {
    super();
    this.preferenceParser = args.preferenceParser;
    this.requestParser = args.requestParser;
    this.errorHandler = args.errorHandler;
    this.responseWriter = args.responseWriter;
    this.metadataCollector = args.metadataCollector;
    this.operationHandler = args.operationHandler;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    let result: ResponseDescription;
    let preferences: RepresentationPreferences = { type: { 'text/plain': 1 }};

    try {
      preferences = await this.preferenceParser.handleSafe({ request });
      result = await this.handleRequest(request, response, preferences);
    } catch (error: unknown) {
      result = await this.handleError(error, preferences);
    }

    if (result) {
      await this.responseWriter.handleSafe({ response, result });
    }
  }

  /**
   * Interprets the request and passes the generated Operation object to the stored OperationHttpHandler.
   */
  private async handleRequest(request: HttpRequest, response: HttpResponse, preferences: RepresentationPreferences):
  Promise<ResponseDescription> {
    const operation = await this.requestParser.handleSafe({ request, preferences });
    const result = await this.operationHandler.handleSafe({ operation, request, response });

    if (result?.metadata) {
      await this.metadataCollector.handleSafe({ operation, metadata: result.metadata });
    }

    this.logger.verbose(`Parsed ${operation.method} operation on ${operation.target.path}`);
    return result;
  }

  /**
   * Handles the error output correctly based on the preferences.
   */
  private async handleError(error: unknown, preferences: RepresentationPreferences): Promise<ResponseDescription> {
    assertError(error);
    const result = await this.errorHandler.handleSafe({ error, preferences });
    if (HttpError.isInstance(error) && result.metadata) {
      const quads = error.generateMetadata(result.metadata.identifier);
      result.metadata.addQuads(quads);
    }
    return result;
  }
}
