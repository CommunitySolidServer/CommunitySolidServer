/**
  * Represents preferred values along a single content negotiation dimension.
  *
  * The number represents how preferred this value is from 0 to 1.
  * Follows the quality values rule from RFC 7231:
  * "The weight is normalized to a real number in the range 0 through 1,
  * where 0.001 is the least preferred and 1 is the most preferred; a
  * value of 0 means "not acceptable"."
  */
export type ValuePreferences = Record<string, number>;

/**
 * Contains preferences along multiple content negotiation dimensions.
 *
 * All dimensions are optional for ease of constructing; either `undefined`
 * or an empty `ValuePreferences` can indicate that no preferences were specified.
 */
export interface RepresentationPreferences {
  type?: ValuePreferences;
  charset?: ValuePreferences;
  datetime?: ValuePreferences;
  encoding?: ValuePreferences;
  language?: ValuePreferences;
}
