import { getLoggerFor } from '../../../logging/LogUtil';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { guardedStreamFrom } from '../../../util/StreamUtil';
import type { ResponseDescription } from '../response/ResponseDescription';
import type { ErrorHandlerArgs } from './ErrorHandler';
import { ErrorHandler } from './ErrorHandler';

/**
 * Returns a simple text description of an error.
 * This class is a failsafe in case the wrapped error handler fails.
 */
export class SafeErrorHandler extends ErrorHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly errorHandler: ErrorHandler;
  private readonly showStackTrace: boolean;

  public constructor(errorHandler: ErrorHandler, showStackTrace = false) {
    super();
    this.errorHandler = errorHandler;
    this.showStackTrace = showStackTrace;
  }

  public async handle(input: ErrorHandlerArgs): Promise<ResponseDescription> {
    try {
      return await this.errorHandler.handleSafe(input);
    } catch (error: unknown) {
      this.logger.debug(`Recovering from error handler failure: ${createErrorMessage(error)}`);
    }
    const { error } = input;
    error.metadata.contentType = 'text/plain';

    const text = typeof error.stack === 'string' && this.showStackTrace ?
      `${error.stack}\n` :
      `${error.name}: ${error.message}\n`;

    return {
      statusCode: error.statusCode,
      metadata: error.metadata,
      data: guardedStreamFrom(text),
    };
  }
}
