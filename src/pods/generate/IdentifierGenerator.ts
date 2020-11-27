import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';

/**
 * Utility class for generating container identifiers.
 */
export interface IdentifierGenerator {
  /**
   * Generates container identifiers based on an input slug.
   * This is simply string generation, no resource-related checks are run.
   */
  generate: (slug: string) => ResourceIdentifier;
}
