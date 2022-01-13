/**
 * Describes the size of something by stating how much of a certain unit is present.
 */
export interface Size {
  unit: string;
  amount: number;
}

export const UNIT_BYTES = 'bytes';
