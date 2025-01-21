import { DataFactory } from 'n3';
import { getLoggerFor } from '../../../logging/LogUtil';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { SOLID_ERROR } from '../../../util/Vocabularies';
import type { TargetExtractor } from '../../input/identifier/TargetExtractor';
import type { ResponseDescription } from '../response/ResponseDescription';
import type { ErrorHandlerArgs } from './ErrorHandler';
import { ErrorHandler } from './ErrorHandler';

/**
 * Adds metadata to an error to indicate the identifier of the originally targeted resource.
 */
export class TargetExtractorErrorHandler extends ErrorHandler {
  protected readonly logger = getLoggerFor(this);

  protected readonly errorHandler: ErrorHandler;
  protected readonly targetExtractor: TargetExtractor;

  public constructor(errorHandler: ErrorHandler, targetExtractor: TargetExtractor) {
    super();
    this.errorHandler = errorHandler;
    this.targetExtractor = targetExtractor;
  }

  public async canHandle(input: ErrorHandlerArgs): Promise<void> {
    return this.errorHandler.canHandle(input);
  }

  public async handle(input: ErrorHandlerArgs): Promise<ResponseDescription> {
    try {
      const target = await this.targetExtractor.handleSafe(input);
      input.error.metadata.add(SOLID_ERROR.terms.target, DataFactory.namedNode(target.path));
    } catch (error) {
      this.logger.warn(`Unable to add identifier to error metadata: ${createErrorMessage(error)}`);
    }
    return this.errorHandler.handle(input);
  }
}
