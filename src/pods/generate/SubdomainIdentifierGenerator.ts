import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { ensureTrailingSlash, extractScheme } from '../../util/PathUtil';
import type { IdentifierGenerator } from './IdentifierGenerator';

/**
 * Generates identifiers by using the name as a subdomain on the base URL.
 * Non-alphanumeric characters will be replaced with `-`.
 */
export class SubdomainIdentifierGenerator implements IdentifierGenerator {
  private readonly baseParts: { scheme: string; rest: string };

  public constructor(baseUrl: string) {
    this.baseParts = extractScheme(ensureTrailingSlash(baseUrl));
  }

  public generate(name: string): ResourceIdentifier {
    // Using the punycode converter is a risk as it doesn't convert slashes for example
    const cleanName = name.replace(/\W/gu, '-');
    return { path: `${this.baseParts.scheme}${cleanName}.${this.baseParts.rest}` };
  }
}
