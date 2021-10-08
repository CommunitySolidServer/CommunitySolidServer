import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { ensureTrailingSlash, trimTrailingSlashes } from '../util/PathUtil';

import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { PermissionSet } from './permissions/Permissions';

/**
 * Redirects requests to specific PermissionReaders based on their identifier.
 * The keys in the input map will be converted to regular expressions.
 * The regular expressions should all start with a slash
 * and will be evaluated relative to the base URL.
 *
 * Will error if no match is found.
 */
export class PathBasedReader extends PermissionReader {
  private readonly baseUrl: string;
  private readonly paths: Map<RegExp, PermissionReader>;

  public constructor(baseUrl: string, paths: Record<string, PermissionReader>) {
    super();
    this.baseUrl = ensureTrailingSlash(baseUrl);
    const entries = Object.entries(paths)
      .map(([ key, val ]): [RegExp, PermissionReader] => [ new RegExp(key, 'u'), val ]);
    this.paths = new Map(entries);
  }

  public async canHandle(input: PermissionReaderInput): Promise<void> {
    const reader = this.findReader(input.identifier.path);
    await reader.canHandle(input);
  }

  public async handle(input: PermissionReaderInput): Promise<PermissionSet> {
    const reader = this.findReader(input.identifier.path);
    return reader.handle(input);
  }

  /**
   * Find the PermissionReader corresponding to the given path.
   * Errors if there is no match.
   */
  private findReader(path: string): PermissionReader {
    if (path.startsWith(this.baseUrl)) {
      // We want to keep the leading slash
      const relative = path.slice(trimTrailingSlashes(this.baseUrl).length);
      for (const [ regex, reader ] of this.paths) {
        if (regex.test(relative)) {
          return reader;
        }
      }
    }
    throw new NotImplementedHttpError('No regex matches the given path.');
  }
}
