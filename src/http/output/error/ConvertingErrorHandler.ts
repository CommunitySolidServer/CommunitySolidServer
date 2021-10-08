import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../storage/conversion/RepresentationConverter';
import { INTERNAL_ERROR } from '../../../util/ContentTypes';
import { getStatusCode } from '../../../util/errors/ErrorUtil';
import { toLiteral } from '../../../util/TermUtil';
import { HTTP, XSD } from '../../../util/Vocabularies';
import { BasicRepresentation } from '../../representation/BasicRepresentation';
import type { Representation } from '../../representation/Representation';
import { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import type { ResponseDescription } from '../response/ResponseDescription';
import type { ErrorHandlerArgs } from './ErrorHandler';
import { ErrorHandler } from './ErrorHandler';

// Used by internal helper function
type PreparedArguments = {
  statusCode: number;
  conversionArgs: RepresentationConverterArgs;
};

/**
 * Converts an error into a Representation of content type internal/error.
 * Then feeds that representation into its converter to create a representation based on the given preferences.
 */
export class ConvertingErrorHandler extends ErrorHandler {
  private readonly converter: RepresentationConverter;
  private readonly showStackTrace: boolean;

  public constructor(converter: RepresentationConverter, showStackTrace = false) {
    super();
    this.converter = converter;
    this.showStackTrace = showStackTrace;
  }

  public async canHandle(input: ErrorHandlerArgs): Promise<void> {
    const { conversionArgs } = this.prepareArguments(input);

    await this.converter.canHandle(conversionArgs);
  }

  public async handle(input: ErrorHandlerArgs): Promise<ResponseDescription> {
    const { statusCode, conversionArgs } = this.prepareArguments(input);

    const converted = await this.converter.handle(conversionArgs);

    return this.createResponse(statusCode, converted);
  }

  public async handleSafe(input: ErrorHandlerArgs): Promise<ResponseDescription> {
    const { statusCode, conversionArgs } = this.prepareArguments(input);

    const converted = await this.converter.handleSafe(conversionArgs);

    return this.createResponse(statusCode, converted);
  }

  /**
   * Prepares the arguments used by all functions.
   */
  private prepareArguments({ error, preferences }: ErrorHandlerArgs): PreparedArguments {
    const statusCode = getStatusCode(error);
    const representation = this.toRepresentation(error, statusCode);
    const identifier = { path: representation.metadata.identifier.value };
    return { statusCode, conversionArgs: { identifier, representation, preferences }};
  }

  /**
   * Creates a ResponseDescription based on the Representation.
   */
  private createResponse(statusCode: number, converted: Representation): ResponseDescription {
    return {
      statusCode,
      metadata: converted.metadata,
      data: converted.data,
    };
  }

  /**
   * Creates a Representation based on the given error.
   * Content type will be internal/error.
   * The status code is used for metadata.
   */
  private toRepresentation(error: Error, statusCode: number): Representation {
    const metadata = new RepresentationMetadata(INTERNAL_ERROR);
    metadata.add(HTTP.terms.statusCodeNumber, toLiteral(statusCode, XSD.terms.integer));

    if (!this.showStackTrace) {
      delete error.stack;
    }

    return new BasicRepresentation([ error ], metadata, false);
  }
}
