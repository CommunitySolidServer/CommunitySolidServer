import type { ValuePreferences } from '../../ldp/representation/RepresentationPreferences';
import { supportsMediaTypeConversion } from './ConversionUtil';
import { RepresentationConverter } from './RepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * A {@link RepresentationConverter} that allows requesting the supported types.
 */
export abstract class TypedRepresentationConverter extends RepresentationConverter {
  /**
   * Gets the supported input content types for this converter, mapped to a numerical priority.
   */
  public abstract getInputTypes(): Promise<ValuePreferences>;

  /**
   * Gets the supported output content types for this converter, mapped to a numerical quality.
   */
  public abstract getOutputTypes(): Promise<ValuePreferences>;

  /**
   * Verifies whether this converter supports the input.
   */
  public async canHandle(args: RepresentationConverterArgs): Promise<void> {
    const types = [ this.getInputTypes(), this.getOutputTypes() ];
    const { contentType } = args.representation.metadata;
    const [ inputTypes, outputTypes ] = await Promise.all(types);
    supportsMediaTypeConversion(contentType, args.preferences.type, inputTypes, outputTypes);
  }
}
