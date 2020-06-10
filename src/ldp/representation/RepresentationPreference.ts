/**
 * Represents a single preference in a request.
 */
export interface RepresentationPreference {
  /**
   * The actual preference value.
   */
  value: string;
  /**
   * How important this preference is in a value going from 0 to 1.
   */
  weight: number;
}
