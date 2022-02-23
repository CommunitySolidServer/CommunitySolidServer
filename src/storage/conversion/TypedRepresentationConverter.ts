import type { ValuePreferences } from '../../http/representation/RepresentationPreferences';
import { RepresentationConverter } from './RepresentationConverter';

/**
 * A {@link RepresentationConverter} that allows requesting the supported types.
 */
export abstract class TypedRepresentationConverter extends RepresentationConverter {
  /**
   * Gets the output content types this converter can convert the input type to, mapped to a numerical priority.
   */
  public abstract getOutputTypes(contentType: string): Promise<ValuePreferences>;
}
