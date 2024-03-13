import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../storage/conversion/RepresentationConverter';
import { INTERNAL_ERROR } from '../../../util/ContentTypes';
import type { PreferenceParser } from '../../input/preferences/PreferenceParser';
import { BasicRepresentation } from '../../representation/BasicRepresentation';
import type { Representation } from '../../representation/Representation';
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
  private readonly preferenceParser: PreferenceParser;
  private readonly showStackTrace: boolean;

  public constructor(converter: RepresentationConverter, preferenceParser: PreferenceParser, showStackTrace = false) {
    super();
    this.converter = converter;
    this.preferenceParser = preferenceParser;
    this.showStackTrace = showStackTrace;
  }

  public async canHandle(input: ErrorHandlerArgs): Promise<void> {
    await this.preferenceParser.canHandle({ request: input.request });
    const { conversionArgs } = await this.extractErrorDetails(input);

    await this.converter.canHandle(conversionArgs);
  }

  public async handle(input: ErrorHandlerArgs): Promise<ResponseDescription> {
    const { statusCode, conversionArgs } = await this.extractErrorDetails(input);

    const converted = await this.converter.handle(conversionArgs);

    return this.createResponse(statusCode, converted);
  }

  public async handleSafe(input: ErrorHandlerArgs): Promise<ResponseDescription> {
    await this.preferenceParser.canHandle({ request: input.request });
    const { statusCode, conversionArgs } = await this.extractErrorDetails(input);

    const converted = await this.converter.handleSafe(conversionArgs);

    return this.createResponse(statusCode, converted);
  }

  /**
   * Prepares the arguments used by all functions.
   */
  private async extractErrorDetails({ error, request }: ErrorHandlerArgs): Promise<PreparedArguments> {
    if (!this.showStackTrace) {
      delete error.stack;
      // Cheating here to delete a readonly field
      delete (error as { cause: unknown }).cause;
    }
    const representation = new BasicRepresentation([ error ], error.metadata, INTERNAL_ERROR, false);
    const identifier = { path: representation.metadata.identifier.value };
    const preferences = await this.preferenceParser.handle({ request });
    return { statusCode: error.statusCode, conversionArgs: { identifier, representation, preferences }};
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
}
