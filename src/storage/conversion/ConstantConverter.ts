import { createReadStream } from 'fs';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { hasMatchingMediaTypes, matchesMediaType } from './ConversionUtil';
import { RepresentationConverter } from './RepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * A {@link RepresentationConverter} that ensures
 * a representation for a certain content type is available.
 *
 * Representations of the same content type are served as is;
 * others are replaced by a constant document.
 *
 * This can for example be used to serve an index.html file,
 * which could then interactively load another representation.
 */
export class ConstantConverter extends RepresentationConverter {
  private readonly filePath: string;
  private readonly contentType: string;

  /**
   * Creates a new constant converter.
   *
   * @param filePath - The path to the constant representation.
   * @param contentType - The content type of the constant representation.
   */
  public constructor(filePath: string, contentType: string) {
    super();
    this.filePath = filePath;
    this.contentType = contentType;
  }

  public async canHandle({ preferences, representation }: RepresentationConverterArgs): Promise<void> {
    // Do not replace the representation if there is no preference for our content type
    if (!preferences.type) {
      throw new NotImplementedHttpError('No content type preferences specified');
    }
    if (!hasMatchingMediaTypes({ ...preferences.type, '*/*': 0 }, { [this.contentType]: 1 })) {
      throw new NotImplementedHttpError(`No preference for ${this.contentType}`);
    }

    // Do not replace the representation if it already has our content type
    if (matchesMediaType(representation.metadata.contentType ?? '', this.contentType)) {
      throw new NotImplementedHttpError(`Representation is already ${this.contentType}`);
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
