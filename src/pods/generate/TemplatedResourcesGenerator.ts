import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Resource } from './ResourcesGenerator';
import Dict = NodeJS.Dict;

/**
 * Generator used to create resources relative to a given base identifier.
 * Similar to {@link ResourcesGenerator}, but takes as input a string
 * indicating where the templates are stored that need to be used for resource generation.
 */
export interface TemplatedResourcesGenerator {
  /**
   * Generates resources with the given options, based on the given template folder.
   * The output Iterable should be sorted so that containers always appear before their contents.
   *
   * @param templateFolder - Folder where the templates are located.
   * @param location - Base identifier.
   * @param options - Options that can be used when generating resources.
   *
   * @returns A map where the keys are the identifiers and the values the corresponding representations to store.
   */
  generate: (templateFolder: string, location: ResourceIdentifier, options: Dict<unknown>) => AsyncIterable<Resource>;
}
