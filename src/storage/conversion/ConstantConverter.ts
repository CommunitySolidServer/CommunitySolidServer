import { createReadStream } from 'fs';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { isContainerIdentifier } from '../../util/PathUtil';
import { cleanPreferences, getTypeWeight, matchesMediaType } from './ConversionUtil';
import { RepresentationConverter } from './RepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Extra options for the ConstantConverter.
 */
export interface ConstantConverterOptions {
  /**
   * Whether this should trigger on containers.
   */
  container?: boolean;
  /**
   * Whether this should trigger on documents.
   */
  document?: boolean;
  /**
   * The minimum requested quality/preference before this should trigger.
   */
  minQuality?: number;
  /**
   * Media ranges for which the conversion should happen.
   */
  enabledMediaRanges?: string[];
  /**
   * Media ranges for which the conversion should not happen.
   */
  disabledMediaRanges?: string[];
}

/**
 * A {@link RepresentationConverter} that ensures
 * a representation for a certain content type is available.
 *
 * Representations of the same content type are served as is;
 * others are replaced by a constant document.
 *
 * This can for example be used to serve an index.html file,
 * which could then interactively load another representation.
 *
 * Options default to the most permissive values when not defined.
 */
export class ConstantConverter extends RepresentationConverter {
  private readonly filePath: string;
  private readonly contentType: string;
  private readonly options: Required<ConstantConverterOptions>;

  /**
   * Creates a new constant converter.
   *
   * @param filePath - The path to the constant representation.
   * @param contentType - The content type of the constant representation.
   * @param options - Extra options for the converter.
   */
  public constructor(filePath: string, contentType: string, options: ConstantConverterOptions = {}) {
    super();
    this.filePath = filePath;
    this.contentType = contentType;
    this.options = {
      container: options.container ?? true,
      document: options.document ?? true,
      minQuality: options.minQuality ?? 0,
      enabledMediaRanges: options.enabledMediaRanges ?? [ '*/*' ],
      disabledMediaRanges: options.disabledMediaRanges ?? [],
    };
  }

  public async canHandle({ identifier, preferences, representation }: RepresentationConverterArgs): Promise<void> {
    // Do not replace the representation if there is no preference for our content type
    if (!preferences.type) {
      throw new NotImplementedHttpError('No content type preferences specified');
    }

    // Do not replace the representation of unsupported resource types
    const isContainer = isContainerIdentifier(identifier);
    if (isContainer && !this.options.container) {
      throw new NotImplementedHttpError('Containers are not supported');
    }
    if (!isContainer && !this.options.document) {
      throw new NotImplementedHttpError('Documents are not supported');
    }

    // Do not replace the representation if the preference weight is too low
    // eslint-disable-next-line ts/naming-convention
    const quality = getTypeWeight(this.contentType, cleanPreferences({ ...preferences.type, '*/*': 0 }));
    if (quality === 0) {
      throw new NotImplementedHttpError(`No preference for ${this.contentType}`);
    } else if (quality < this.options.minQuality) {
      throw new NotImplementedHttpError(`Preference is lower than the specified minimum quality`);
    }

    const sourceContentType = representation.metadata.contentType ?? '';
    // Do not replace the representation if it already has our content type
    if (matchesMediaType(sourceContentType, this.contentType)) {
      throw new NotImplementedHttpError(`Representation is already ${this.contentType}`);
    }

    // Only replace the representation if it matches the media range settings
    if (!this.options.enabledMediaRanges.some((type): boolean => matchesMediaType(sourceContentType, type))) {
      throw new NotImplementedHttpError(`${sourceContentType} is not one of the enabled media types.`);
    }
    if (this.options.disabledMediaRanges.some((type): boolean => matchesMediaType(sourceContentType, type))) {
      throw new NotImplementedHttpError(`${sourceContentType} is one of the disabled media types.`);
    }
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    // Ignore the original representation
    representation.data.destroy();

    // Create a new representation from the constant file
    const data = createReadStream(this.filePath, 'utf8');
    return new BasicRepresentation(data, representation.metadata, this.contentType);
  }
}
