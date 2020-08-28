import { RuntimeConfig } from '../init/RuntimeConfig';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ensureTrailingSlash } from '../util/Util';
import { ContainerManager } from './ContainerManager';

/**
 * Determines containers based on URL decomposition.
 */
export class UrlContainerManager implements ContainerManager {
  private readonly runtimeConfig: RuntimeConfig;

  public constructor(runtimeConfig: RuntimeConfig) {
    this.runtimeConfig = runtimeConfig;
  }

  public async getContainer(id: ResourceIdentifier): Promise<ResourceIdentifier> {
    const path = this.canonicalUrl(id.path);
    if (this.runtimeConfig.base === path) {
      throw new Error('Root does not have a container.');
    }

    const parentPath = new URL('..', path).toString();

    // This probably means there is an issue with the root
    if (parentPath === path) {
      throw new Error('URL root reached.');
    }

    return { path: parentPath };
  }

  private canonicalUrl(path: string): string {
    return ensureTrailingSlash(path.toString());
  }
}
