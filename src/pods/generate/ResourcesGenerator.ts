import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import Dict = NodeJS.Dict;

export interface Resource {
  identifier: ResourceIdentifier;
  representation: Representation;
}

/**
 * Generator used to create resources relative to a given base identifier.
 */
export interface ResourcesGenerator {
  /**
   * Generates resources with the given options.
   * The output Map should be sorted so that containers always appear before their contents.
   * @param location - Base identifier.
   * @param options - Options that can be used when generating resources.
   *
   * @returns A map where the keys are the identifiers and the values the corresponding representations to store.
   */
  generate: (location: ResourceIdentifier, options: Dict<string>) => AsyncIterable<Resource>;
}
