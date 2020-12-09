import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { InternalServerError } from '../errors/InternalServerError';
import { ensureTrailingSlash } from '../PathUtil';
import type { IdentifierStrategy } from './IdentifierStrategy';

/**
 * An IdentifierStrategy that assumes there is only 1 root and all other identifiers are made by appending to that root.
 */
export class SingleRootIdentifierStrategy implements IdentifierStrategy {
  private readonly baseUrl: string;

  public constructor(baseUrl: string) {
    this.baseUrl = ensureTrailingSlash(baseUrl);
  }

  public supportsIdentifier(identifier: ResourceIdentifier): boolean {
    return identifier.path.startsWith(this.baseUrl);
  }

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

  public isRootContainer(identifier: ResourceIdentifier): boolean {
    return identifier.path === this.baseUrl;
  }
}
