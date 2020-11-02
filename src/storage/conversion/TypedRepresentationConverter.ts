import { RepresentationConverter } from './RepresentationConverter';

/**
 * A {@link RepresentationConverter} that allows requesting the supported types.
 */
export abstract class TypedRepresentationConverter extends RepresentationConverter {
  /**
   * Get a hash of all supported input content types for this converter, mapped to a numerical priority.
   * The priority weight goes from 0 up to 1.
   * @returns A promise resolving to a hash mapping content type to a priority number.
   */
  public abstract getInputTypes(): Promise<Record<string, number>>;

  /**
   * Get a hash of all supported output content types for this converter, mapped to a numerical priority.
   * The priority weight goes from 0 up to 1.
   * @returns A promise resolving to a hash mapping content type to a priority number.
   */
  public abstract getOutputTypes(): Promise<Record<string, number>>;
}
