import type { Representation } from '../../http/representation/Representation';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { UnsupportedAsyncHandler } from '../../util/handlers/UnsupportedAsyncHandler';
import { matchesMediaPreferences } from './ConversionUtil';
import { RepresentationConverter } from './RepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

const EMPTY_CONVERTER = new UnsupportedAsyncHandler('The content type does not match the preferences');

/**
 * A {@link RepresentationConverter} that only converts representations
 * that are not compatible with the preferences.
 */
export class IfNeededConverter extends RepresentationConverter {
  private readonly converter: RepresentationConverter;
  private readonly ignoreWildcards?: boolean;
  protected readonly logger = getLoggerFor(this);

  /**
   * @param converter - Converter to delegate to if conversion is needed;
   *   if none, a non-satisfiable preference will be signaled by throwing an error.
   * @param ignoreWildcards - Determines how the universal wildcard *／* is treated:
   *   if set to `true`, never considers *／* a match, so conversion is needed;
   *   if set to `false`, always considers *／* a match, so conversion is not needed;
   *   if left `undefined`, only considers *／* a match if it has the highest preference score
   */
  public constructor(converter: RepresentationConverter = EMPTY_CONVERTER, ignoreWildcards?: boolean) {
    super();
    this.converter = converter;
    this.ignoreWildcards = ignoreWildcards;
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
    const { contentType } = representation.metadata;
    if (!contentType) {
      throw new InternalServerError('Content-Type is required for data conversion.');
    }

    // Treat universal wildcards separately, since user agents often use them as a fallback
    let typePreferences = preferences.type ?? {};
    const wildcardWeight = typePreferences['*/*'] ?? 0;
    if (this.ignoreWildcards !== false && wildcardWeight !== 0) {
      // Ignore wildcards if explicitly excluded…
      if (this.ignoreWildcards === true) {
        typePreferences = { ...typePreferences, '*/*': 0 };
      // …or if the request does not have them as the highest preference
      } else if (wildcardWeight !== 1 && wildcardWeight !== Math.max(...Object.values(typePreferences))) {
        typePreferences = { ...typePreferences, '*/*': 0 };
      }
    }

    // Only convert if there no are matches for the provided content type
    const noMatchingMediaType = !matchesMediaPreferences(contentType, typePreferences);
    if (noMatchingMediaType) {
      this.logger.debug(`Conversion needed for ${identifier
        .path} from ${contentType} to satisfy ${!preferences.type ?
        '""' :
        Object.entries(preferences.type).map(([ value, weight ]): string => `${value};q=${weight}`).join(', ')}`);
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
