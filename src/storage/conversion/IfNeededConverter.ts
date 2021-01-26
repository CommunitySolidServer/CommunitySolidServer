import type { Representation } from '../../ldp/representation/Representation';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { UnsupportedAsyncHandler } from '../../util/handlers/UnsupportedAsyncHandler';
import { hasMatchingMediaTypes } from './ConversionUtil';
import { RepresentationConverter } from './RepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

const EMPTY_CONVERTER = new UnsupportedAsyncHandler('The content type does not match the preferences');

/**
 * A {@link RepresentationConverter} that only converts representations
 * that are not compatible with the preferences.
 */
export class IfNeededConverter extends RepresentationConverter {
  private readonly converter: RepresentationConverter;
  protected readonly logger = getLoggerFor(this);

  public constructor(converter: RepresentationConverter = EMPTY_CONVERTER) {
    super();
    this.converter = converter;
  }

  public async canHandle(args: RepresentationConverterArgs): Promise<void> {
    if (this.needsConversion(args)) {
      await this.converter.canHandle(args);
    }
  }

  public async handle(args: RepresentationConverterArgs): Promise<Representation> {
    return !this.needsConversion(args) ? args.representation : this.convert(args, false);
  }

  public async handleSafe(args: RepresentationConverterArgs): Promise<Representation> {
    return !this.needsConversion(args) ? args.representation : this.convert(args, true);
  }

  protected needsConversion({ identifier, representation, preferences }: RepresentationConverterArgs): boolean {
    // No conversion needed if no preferences were specified
    if (!preferences.type) {
      return false;
    }

    // No conversion is needed if there are any matches for the provided content type
    const { contentType } = representation.metadata;
    if (!contentType) {
      throw new InternalServerError('Content-Type is required for data conversion.');
    }
    const noMatchingMediaType = !hasMatchingMediaTypes(preferences.type, { [contentType]: 1 });
    if (noMatchingMediaType) {
      this.logger.debug(`Conversion needed for ${identifier
        .path} from ${representation.metadata.contentType} to satisfy ${Object.entries(preferences.type)
        .map(([ value, weight ]): string => `${value};q=${weight}`).join(', ')}`);
    }
    return noMatchingMediaType;
  }

  protected async convert(args: RepresentationConverterArgs, safely: boolean): Promise<Representation> {
    const converted = await (safely ? this.converter.handleSafe(args) : this.converter.handle(args));
    this.logger.info(`Converted representation for ${args.identifier
      .path} from ${args.representation.metadata.contentType} to ${converted.metadata.contentType}`);
    return converted;
  }
}
