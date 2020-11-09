/**
 * Represents a single preference in a request.
 */
export interface RepresentationPreference {
  /**
   * The actual preference value.
   */
  value: string;
  /**
   * How preferred this value is in a number going from 0 to 1.
   * Follows the quality values rule from RFC 7231:
   *
   * "The weight is normalized to a real number in the range 0 through 1,
   * where 0.001 is the least preferred and 1 is the most preferred; a
   * value of 0 means "not acceptable"."
   */
  weight: number;
}
