import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { ensureTrailingSlash } from '../../util/PathUtil';
import type { IdentifierGenerator } from './IdentifierGenerator';

/**
 * Generates identifiers by appending the slug to a stored base identifier.
 * Non-alphanumeric characters will be replaced with `-`.
 */
export class SuffixIdentifierGenerator implements IdentifierGenerator {
  private readonly base: string;

  public constructor(base: string) {
    this.base = base;
  }

  public generate(slug: string): ResourceIdentifier {
    const cleanSlug = slug.replace(/\W/gu, '-');
    return { path: ensureTrailingSlash(new URL(cleanSlug, this.base).href) };
  }
}
