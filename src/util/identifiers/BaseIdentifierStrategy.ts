import { URL } from 'url';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { InternalServerError } from '../errors/InternalServerError';
import { ensureTrailingSlash, isContainerIdentifier } from '../PathUtil';
import type { IdentifierStrategy } from './IdentifierStrategy';

/**
 * Provides a default implementation for `getParentContainer`
 * which checks if the identifier is supported and not a root container.
 * If not, the last part before the first relevant slash will be removed to find the parent.
 *
 * Provides a default implementation for `contains`
 * which does standard slash-semantics based string comparison.
 */
export abstract class BaseIdentifierStrategy implements IdentifierStrategy {
  public abstract supportsIdentifier(identifier: ResourceIdentifier): boolean;

  public getParentContainer(identifier: ResourceIdentifier): ResourceIdentifier {
    if (!this.supportsIdentifier(identifier)) {
      throw new InternalServerError(`The identifier ${identifier.path} is outside the configured identifier space.`,
        { errorCode: 'E0001', details: { path: identifier.path }});
    }
    if (this.isRootContainer(identifier)) {
      throw new InternalServerError(`Cannot obtain the parent of ${identifier.path} because it is a root container.`);
    }

    // Trailing slash is necessary for URL library
    const parentPath = new URL('..', ensureTrailingSlash(identifier.path)).href;

    return { path: parentPath };
  }

  public abstract isRootContainer(identifier: ResourceIdentifier): boolean;

  public contains(container: ResourceIdentifier, identifier: ResourceIdentifier, transitive: boolean): boolean {
    if (!isContainerIdentifier(container)) {
      return false;
    }

    if (!identifier.path.startsWith(container.path)) {
      return false;
    }

    if (transitive) {
      return true;
    }

    const tail = identifier.path.slice(container.path.length);
    // If there is at least one `/` followed by a char this is not a direct parent container
    return !/\/./u.test(tail);
  }
}
