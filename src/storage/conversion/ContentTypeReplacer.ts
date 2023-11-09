import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ValuePreferences } from '../../http/representation/RepresentationPreferences';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { getConversionTarget, matchesMediaType } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * A {@link RepresentationConverter} that changes the content type
 * but does not alter the representation.
 *
 * Useful for when a content type is binary-compatible with another one;
 * for instance, all JSON-LD files are valid JSON files.
 */
export class ContentTypeReplacer extends TypedRepresentationConverter {
  private readonly contentTypeMap: Record<string, ValuePreferences> = {};

  /**
   * @param replacements - Map of content type patterns and content types to replace them by.
   */
  public constructor(replacements: Record<string, string>);
  public constructor(replacements: Record<string, Iterable<string>>);
  public constructor(replacements: Record<string, string | Iterable<string>>) {
    super();
    // Store the replacements as value preferences,
    // completing any transitive chains (A:B, B:C, C:D => A:B,C,D)
    for (const inputType of Object.keys(replacements)) {
      this.contentTypeMap[inputType] = {};
      (function addReplacements(inType, outTypes): void {
        const replace = replacements[inType] ?? [];
        const newTypes = typeof replace === 'string' ? [ replace ] : replace;
        for (const newType of newTypes) {
          if (!(newType in outTypes)) {
            outTypes[newType] = 1;
            addReplacements(newType, outTypes);
          }
        }
      })(inputType, this.contentTypeMap[inputType]);
    }
  }

  public async getOutputTypes(contentType: string): Promise<ValuePreferences> {
    const supported = Object.keys(this.contentTypeMap)
      .filter((type): boolean => matchesMediaType(contentType, type))
      .map((type): ValuePreferences => this.contentTypeMap[type]);
    return Object.assign({}, ...supported) as ValuePreferences;
  }

  public async canHandle({ representation, preferences }: RepresentationConverterArgs): Promise<void> {
    await this.getReplacementType(representation.metadata.contentType, preferences.type);
  }

  /**
   * Changes the content type on the representation.
   */
  public async handle({ representation, preferences }: RepresentationConverterArgs): Promise<Representation> {
    const contentType = await this.getReplacementType(representation.metadata.contentType, preferences.type);
    const metadata = new RepresentationMetadata(representation.metadata, contentType);
    return { ...representation, metadata };
  }

  public async handleSafe(args: RepresentationConverterArgs): Promise<Representation> {
    return this.handle(args);
  }

  /**
   * Find a replacement content type that matches the preferences,
   * or throws an error if none was found.
   */
  private async getReplacementType(contentType = 'unknown', preferred: ValuePreferences = {}): Promise<string> {
    const supported = await this.getOutputTypes(contentType);
    const match = getConversionTarget(supported, preferred);
    if (!match) {
      throw new NotImplementedHttpError(`Cannot convert from ${contentType} to ${Object.keys(preferred).join(',')}`);
    }
    return match;
  }
}
