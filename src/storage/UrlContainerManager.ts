import { ContainerManager } from './ContainerManager';
import { ensureTrailingSlash } from '../util/Util';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';

/**
 * Determines containers based on URL decomposition.
 */
export class UrlContainerManager implements ContainerManager {
  private readonly root: string;

  public constructor(root: string) {
    this.root = this.canonicalUrl(root);
  }

  public async getContainer(id: ResourceIdentifier): Promise<ResourceIdentifier> {
    const path = this.canonicalUrl(id.path);
    if (this.root === path) {
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
    return ensureTrailingSlash(new URL(path).toString());
  }
}
