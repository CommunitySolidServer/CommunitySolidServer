import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { ensureTrailingSlash } from '../util/Util';
import type { ContainerManager } from './ContainerManager';

/**
 * Determines containers based on URL decomposition.
 */
export class UrlContainerManager implements ContainerManager {
  protected readonly logger = getLoggerFor(this);

  private readonly base: string;

  public constructor(base: string) {
    this.base = base;
  }

  public async getContainer(id: ResourceIdentifier): Promise<ResourceIdentifier> {
    const path = this.canonicalUrl(id.path);
    if (this.base === path) {
      this.logger.error('Root does not have a container.');
      throw new Error('Root does not have a container.');
    }

    const parentPath = new URL('..', path).toString();

    // This probably means there is an issue with the root
    if (parentPath === path) {
      this.logger.error('URL root reached.');
      throw new Error('URL root reached.');
    }

    return { path: parentPath };
  }

  private canonicalUrl(path: string): string {
    return ensureTrailingSlash(path.toString());
  }
}
