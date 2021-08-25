import type { ErrorHandler } from '../ldp/http/ErrorHandler';
import type { RequestParser } from '../ldp/http/RequestParser';
import type { ResponseDescription } from '../ldp/http/response/ResponseDescription';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
import type { Operation } from '../ldp/operations/Operation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { getLoggerFor } from '../logging/LogUtil';
import { assertError } from '../util/errors/ErrorUtil';
import type { HttpHandlerInput } from './HttpHandler';
import { HttpHandler } from './HttpHandler';
import type { HttpRequest } from './HttpRequest';
import type { HttpResponse } from './HttpResponse';

export interface BaseHttpHandlerArgs {
  /**
   * Parses the incoming requests.
   */
  requestParser: RequestParser;
  /**
   * Converts errors to a serializable format.
   */
  errorHandler: ErrorHandler;
  /**
   * Writes out the response of the operation.
   */
  responseWriter: ResponseWriter;
}

/**
 * Parses requests and sends the resulting Operation to the abstract `handleOperation` function.
 * Errors are caught and handled by the Errorhandler.
 * In case the `handleOperation` function returns a result it will be sent to the ResponseWriter.
 */
export abstract class BaseHttpHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  protected readonly requestParser: RequestParser;
  protected readonly errorHandler: ErrorHandler;
  protected readonly responseWriter: ResponseWriter;

  protected constructor(args: BaseHttpHandlerArgs) {
    super();
    this.requestParser = args.requestParser;
    this.errorHandler = args.errorHandler;
    this.responseWriter = args.responseWriter;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    let result: ResponseDescription | undefined;
    let preferences: RepresentationPreferences = { type: { 'text/plain': 1 }};

    try {
      const operation = await this.requestParser.handleSafe(request);
      ({ preferences } = operation);
      result = await this.handleOperation(operation, request, response);
      this.logger.verbose(`Parsed ${operation.method} operation on ${operation.target.path}`);
    } catch (error: unknown) {
      assertError(error);
      result = await this.errorHandler.handleSafe({ error, preferences });
    }

    if (result) {
      await this.responseWriter.handleSafe({ response, result });
    }
  }

  /**
   * Handles the operation. Should return a ResponseDescription if it does not handle the response itself.
   */
  protected abstract handleOperation(operation: Operation, request: HttpRequest, response: HttpResponse):
  Promise<ResponseDescription | undefined>;
}
