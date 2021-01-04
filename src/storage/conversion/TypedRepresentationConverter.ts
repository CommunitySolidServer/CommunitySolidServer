import type { RepresentationPreference } from '../../ldp/representation/RepresentationPreference';
import { supportsConversion } from './ConversionUtil';
import { RepresentationConverter } from './RepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * A {@link RepresentationConverter} that allows requesting the supported types.
 */
export abstract class TypedRepresentationConverter extends RepresentationConverter {
  /**
   * Gets the supported input content types for this converter, mapped to a numerical priority.
   */
  public abstract getInputTypes(): Promise<RepresentationPreference>;

  /**
   * Gets the supported output content types for this converter, mapped to a numerical quality.
   */
  public abstract getOutputTypes(): Promise<RepresentationPreference>;

  /**
   * Verifies whether this converter supports the input.
   */
  public async canHandle(args: RepresentationConverterArgs): Promise<void> {
    const types = [ this.getInputTypes(), this.getOutputTypes() ];
    const [ inputTypes, outputTypes ] = await Promise.all(types);
    supportsConversion(args, Object.keys(inputTypes), Object.keys(outputTypes));
  }
}
