import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Resource, ResourcesGenerator } from './ResourcesGenerator';
import type { TemplatedResourcesGenerator } from './TemplatedResourcesGenerator';
import Dict = NodeJS.Dict;

/**
 * Stores a static template folder that will be used to call the wrapped {@link TemplatedResourcesGenerator}.
 */
export class StaticFolderGenerator implements ResourcesGenerator {
  private readonly resourcesGenerator: TemplatedResourcesGenerator;
  private readonly templateFolder: string;

  public constructor(resourcesGenerator: TemplatedResourcesGenerator, templateFolder: string) {
    this.resourcesGenerator = resourcesGenerator;
    this.templateFolder = templateFolder;
  }

  public generate(location: ResourceIdentifier, options: Dict<unknown>): AsyncIterable<Resource> {
    return this.resourcesGenerator.generate(this.templateFolder, location, options);
  }
}
