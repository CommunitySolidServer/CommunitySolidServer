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
import type { OperationHttpHandler } from './OperationHttpHandler';

export interface ParsingHttpHandlerArgs {
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
 * Parses requests and sends the resulting Operation to wrapped operationHandler.
 * Errors are caught and handled by the Errorhandler.
 * In case the operationHandler returns a result it will be sent to the ResponseWriter.
 */
export class ParsingHttpHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);

  private readonly requestParser: RequestParser;
  private readonly errorHandler: ErrorHandler;
  private readonly responseWriter: ResponseWriter;
  private readonly metadataCollector: OperationMetadataCollector;
  private readonly operationHandler: OperationHttpHandler;

  public constructor(args: ParsingHttpHandlerArgs) {
    super();
    this.requestParser = args.requestParser;
    this.errorHandler = args.errorHandler;
    this.responseWriter = args.responseWriter;
    this.metadataCollector = args.metadataCollector;
    this.operationHandler = args.operationHandler;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    let result: ResponseDescription | undefined;
    let preferences: RepresentationPreferences = { type: { 'text/plain': 1 }};

    try {
      const operation = await this.requestParser.handleSafe(request);
      ({ preferences } = operation);
      result = await this.operationHandler.handleSafe({ operation, request, response });

      if (result?.metadata) {
        await this.metadataCollector.handleSafe({ operation, metadata: result.metadata });
      }

      this.logger.verbose(`Parsed ${operation.method} operation on ${operation.target.path}`);
    } catch (error: unknown) {
      assertError(error);
      result = await this.errorHandler.handleSafe({ error, preferences });
      if (HttpError.isInstance(error) && result.metadata) {
        const quads = error.generateMetadata(result.metadata.identifier);
        result.metadata.addQuads(quads);
      }
    }

    if (result) {
      await this.responseWriter.handleSafe({ response, result });
    }
  }
}
