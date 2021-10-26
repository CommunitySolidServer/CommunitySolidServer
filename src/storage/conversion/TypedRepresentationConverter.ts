import type { ValuePreferences } from '../../http/representation/RepresentationPreferences';
import { RepresentationConverter } from './RepresentationConverter';

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
}
