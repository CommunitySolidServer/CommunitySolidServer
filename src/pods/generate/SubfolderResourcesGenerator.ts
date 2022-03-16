import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { sortedAsyncMerge } from '../../util/IterableUtil';
import { joinFilePath, resolveAssetPath } from '../../util/PathUtil';
import type { Resource } from './ResourcesGenerator';
import type { TemplatedResourcesGenerator } from './TemplatedResourcesGenerator';
import Dict = NodeJS.Dict;

// Sorts Resources based on their identifiers
function comparator(left: Resource, right: Resource): number {
  return left.identifier.path.localeCompare(right.identifier.path);
}

/**
 * Generates all resources found in specific subfolders of the given template folder.
 * In case the same resource is defined in several subfolders,
 * the data of the last subfolder in the list will be used.
 *
 * The results of all the subfolders will be merged so the end result is still a sorted stream of identifiers.
 *
 * One of the main use cases for this class is so template resources can be in a separate folder
 * than their corresponding authorization resources,
 * allowing for authorization-independent templates.
 */
export class SubfolderResourcesGenerator implements TemplatedResourcesGenerator {
  private readonly resourcesGenerator: TemplatedResourcesGenerator;
  private readonly subfolders: string[];

  public constructor(resourcesGenerator: TemplatedResourcesGenerator, subfolders: string[]) {
    this.resourcesGenerator = resourcesGenerator;
    this.subfolders = subfolders;
  }

  public async* generate(templateFolder: string, location: ResourceIdentifier, options: Dict<unknown>):
  AsyncIterable<Resource> {
    const root = resolveAssetPath(templateFolder);
    const templateSubfolders = this.subfolders.map((subfolder): string => joinFilePath(root, subfolder));

    // Build all generators
    const generators: AsyncIterator<Resource>[] = [];
    for (const templateSubfolder of templateSubfolders) {
      generators.push(this.resourcesGenerator.generate(templateSubfolder, location, options)[Symbol.asyncIterator]());
    }

    let previous: ResourceIdentifier = { path: '' };
    for await (const result of sortedAsyncMerge(generators, comparator)) {
      // Skip duplicate results.
      // In practice these are just going to be the same empty containers.
      if (result.identifier.path === previous.path) {
        result.representation.data.destroy();
      } else {
        previous = result.identifier;
        yield result;
      }
    }
  }
}
