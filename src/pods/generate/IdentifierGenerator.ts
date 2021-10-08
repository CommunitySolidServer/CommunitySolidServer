import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

/**
 * Utility class for generating container identifiers.
 */
export interface IdentifierGenerator {
  /**
   * Generates container identifiers based on an input name.
   * This is simply string generation, no resource-related checks are run.
   */
  generate: (name: string) => ResourceIdentifier;
}
