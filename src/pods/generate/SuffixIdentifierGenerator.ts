import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { ensureTrailingSlash } from '../../util/PathUtil';
import type { IdentifierGenerator } from './IdentifierGenerator';

/**
 * Generates identifiers by appending the name to a stored base identifier.
 * Non-alphanumeric characters will be replaced with `-`.
 */
export class SuffixIdentifierGenerator implements IdentifierGenerator {
  private readonly base: string;

  public constructor(base: string) {
    this.base = base;
  }

  public generate(name: string): ResourceIdentifier {
    const cleanName = name.replace(/\W/gu, '-');
    return { path: ensureTrailingSlash(new URL(cleanName, this.base).href) };
  }
}
