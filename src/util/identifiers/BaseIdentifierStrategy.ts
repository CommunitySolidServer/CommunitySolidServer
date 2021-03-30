import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { InternalServerError } from '../errors/InternalServerError';
import { ensureTrailingSlash } from '../PathUtil';
import type { IdentifierStrategy } from './IdentifierStrategy';

/**
 * Provides a default implementation for `getParentContainer`
 * which checks if the identifier is supported and not a root container.
 * If not, the last part before the first relevant slash will be removed to find the parent.
 */
export abstract class BaseIdentifierStrategy implements IdentifierStrategy {
  public abstract supportsIdentifier(identifier: ResourceIdentifier): boolean;

  public getParentContainer(identifier: ResourceIdentifier): ResourceIdentifier {
    if (!this.supportsIdentifier(identifier)) {
      throw new InternalServerError(`${identifier.path} is not supported`);
    }
    if (this.isRootContainer(identifier)) {
      throw new InternalServerError(`${identifier.path} is a root container and has no parent`);
    }

    // Trailing slash is necessary for URL library
    const parentPath = new URL('..', ensureTrailingSlash(identifier.path)).href;

    return { path: parentPath };
  }

  public abstract isRootContainer(identifier: ResourceIdentifier): boolean;
}
