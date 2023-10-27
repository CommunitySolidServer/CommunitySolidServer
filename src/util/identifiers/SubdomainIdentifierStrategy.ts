import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { createSubdomainRegexp, ensureTrailingSlash } from '../PathUtil';
import { BaseIdentifierStrategy } from './BaseIdentifierStrategy';

/**
 * An IdentifierStrategy that interprets all subdomains of the given base URL as roots.
 */
export class SubdomainIdentifierStrategy extends BaseIdentifierStrategy {
  private readonly baseUrl: string;
  private readonly regex: RegExp;
  protected readonly logger = getLoggerFor(this);

  public constructor(baseUrl: string) {
    super();
    this.baseUrl = ensureTrailingSlash(baseUrl);
    this.regex = createSubdomainRegexp(this.baseUrl);
  }

  public supportsIdentifier(identifier: ResourceIdentifier): boolean {
    const supported = this.regex.test(identifier.path);
    this.logger.debug(supported ?
      `Identifier ${identifier.path} is part of ${this.baseUrl}` :
      `Identifier ${identifier.path} is not part of ${this.baseUrl}`);
    return supported;
  }

  public isRootContainer(identifier: ResourceIdentifier): boolean {
    const match = this.regex.exec(identifier.path);
    return Array.isArray(match) && match[0].length === identifier.path.length;
  }
}
