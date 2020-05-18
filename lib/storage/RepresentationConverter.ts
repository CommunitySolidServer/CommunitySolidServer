import { Representation } from '../ldp/http/Representation';
import { RepresentationPreferences } from '../ldp/http/RepresentationPreferences';

/**
 * Allows converting from one resource representation to another.
 */
export interface RepresentationConverter {
  /**
   * Checks if the converter supports converting the given resource based on the given preferences.
   * @param representation - The input representation.
   * @param preferences - The requested representation preferences.
   *
   * @returns A promise resolving to a boolean representing whether this conversion can be done.
   */
  supports: (representation: Representation, preferences: RepresentationPreferences) => Promise<boolean>;
  /**
   * Converts the given representation.
   * @param representation - The input representation to convert.
   * @param preferences - The requested representation preferences.
   *
   * @returns A promise resolving to the requested representation.
   */
  convert: (representation: Representation, preferences: RepresentationPreferences) => Promise<Representation>;
}
