import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { ensureTrailingSlash } from '../../util/PathUtil';
import { sanitizeUrlPart } from '../../util/StringUtil';
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
    const cleanName = sanitizeUrlPart(name);
    return { path: ensureTrailingSlash(new URL(cleanName, this.base).href) };
  }

  public extractPod(identifier: ResourceIdentifier): ResourceIdentifier {
    const { path } = identifier;

    // Invalid identifiers that have no result should never reach this point,
    // but some safety checks just in case.
    if (!path.startsWith(this.base)) {
      throw new BadRequestHttpError(`Invalid identifier ${path}`);
    }

    // The first slash after the base URL indicates the first container on the path
    const idx = path.indexOf('/', this.base.length + 1);

    if (idx < 0) {
      throw new BadRequestHttpError(`Invalid identifier ${path}`);
    }

    // Slice of everything after the first container
    return { path: path.slice(0, idx + 1) };
  }
}
