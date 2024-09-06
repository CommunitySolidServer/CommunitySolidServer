import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { ensureTrailingSlash, extractScheme } from '../../util/PathUtil';
import { sanitizeUrlPart } from '../../util/StringUtil';
import type { IdentifierGenerator } from './IdentifierGenerator';

/**
 * Generates identifiers by using the name as a subdomain on the base URL.
 * Non-alphanumeric characters will be replaced with `-`.
 *
 * When extracting the pod, the base URl is also seen as a pod as there is no issue of nested containers here.
 */
export class SubdomainIdentifierGenerator implements IdentifierGenerator {
  private readonly baseParts: { scheme: string; rest: string };

  public constructor(baseUrl: string) {
    this.baseParts = extractScheme(ensureTrailingSlash(baseUrl));
  }

  public generate(name: string): ResourceIdentifier {
    // Using the punycode converter is a risk as it doesn't convert slashes for example
    const cleanName = sanitizeUrlPart(name);
    return { path: `${this.baseParts.scheme}${cleanName}.${this.baseParts.rest}` };
  }

  public extractPod(identifier: ResourceIdentifier): ResourceIdentifier {
    const { path } = identifier;

    // Invalid identifiers that have no result should never reach this point,
    // but some safety checks just in case.
    if (!path.startsWith(this.baseParts.scheme)) {
      throw new BadRequestHttpError(`Invalid identifier ${path}`);
    }

    const idx = path.indexOf(this.baseParts.rest);

    // If the idx is smaller than this, there was no match
    if (idx < 0) {
      throw new BadRequestHttpError(`Invalid identifier ${path}`);
    }

    // Slice of everything after the base URL tail
    return { path: path.slice(0, idx + this.baseParts.rest.length) };
  }
}
