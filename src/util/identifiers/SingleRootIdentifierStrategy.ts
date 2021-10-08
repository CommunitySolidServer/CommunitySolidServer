import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { ensureTrailingSlash } from '../PathUtil';
import { BaseIdentifierStrategy } from './BaseIdentifierStrategy';

/**
 * An IdentifierStrategy that assumes there is only 1 root and all other identifiers are made by appending to that root.
 */
export class SingleRootIdentifierStrategy extends BaseIdentifierStrategy {
  private readonly baseUrl: string;
  protected readonly logger = getLoggerFor(this);

  public constructor(baseUrl: string) {
    super();
    this.baseUrl = ensureTrailingSlash(baseUrl);
  }

  public supportsIdentifier(identifier: ResourceIdentifier): boolean {
    const supported = identifier.path.startsWith(this.baseUrl);
    this.logger.debug(supported ?
      `Identifier ${identifier.path} is part of ${this.baseUrl}` :
      `Identifier ${identifier.path} is not part of ${this.baseUrl}`);
    return supported;
  }

  public isRootContainer(identifier: ResourceIdentifier): boolean {
    return identifier.path === this.baseUrl;
  }
}
