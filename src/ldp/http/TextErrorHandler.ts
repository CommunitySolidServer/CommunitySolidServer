import { getStatusCode } from '../../util/errors/ErrorUtil';
import { guardedStreamFrom } from '../../util/StreamUtil';
import { toLiteral } from '../../util/TermUtil';
import { HTTP, XSD } from '../../util/Vocabularies';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { ErrorHandlerArgs } from './ErrorHandler';
import { ErrorHandler } from './ErrorHandler';
import type { ResponseDescription } from './response/ResponseDescription';

/**
 * Returns a simple text description of an error.
 * This class is mostly a failsafe in case all other solutions fail.
 */
export class TextErrorHandler extends ErrorHandler {
  private readonly showStackTrace: boolean;

  public constructor(showStackTrace = false) {
    super();
    this.showStackTrace = showStackTrace;
  }

  public async handle({ error }: ErrorHandlerArgs): Promise<ResponseDescription> {
    const statusCode = getStatusCode(error);
    const metadata = new RepresentationMetadata('text/plain');
    metadata.add(HTTP.terms.statusCodeNumber, toLiteral(statusCode, XSD.terms.integer));

    const text = typeof error.stack === 'string' && this.showStackTrace ?
      `${error.stack}\n` :
      `${error.name}: ${error.message}\n`;

    return {
      statusCode,
      metadata,
      data: guardedStreamFrom(text),
    };
  }
}
