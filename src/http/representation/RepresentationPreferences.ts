/**
 * Represents preferred values along a single content negotiation dimension.
 *
 * The number represents how preferred this value is from 0 to 1.
 * Follows the quality values rule from RFC 7231:
 * "The weight is normalized to a real number in the range 0 through 1,
 * where 0.001 is the least preferred and 1 is the most preferred; a
 * value of 0 means "not acceptable"."
 *
 * Because of an open issue in Components.js we cannot use `Record<string, number>` right now.
 * https://github.com/LinkedSoftwareDependencies/Components-Generator.js/issues/103
 */
// eslint-disable-next-line ts/consistent-indexed-object-style
export type ValuePreferences = {[key: string ]: number };

/**
 * A single entry of a {@link ValuePreferences} object.
 * Useful when doing operations on such an object.
 */
export type ValuePreference = { value: string; weight: number };

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
  // `start` can be negative and implies the last X of a stream
  range?: { unit: string; parts: { start: number; end?: number }[] };
}
