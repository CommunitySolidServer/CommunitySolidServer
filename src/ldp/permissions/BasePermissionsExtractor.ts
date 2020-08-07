import { Operation } from '../operations/Operation';
import { PermissionSet } from './PermissionSet';
import { PermissionsExtractor } from './PermissionsExtractor';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';

/**
 * Generates permissions for the base set of methods that always require the same permissions.
 * Specifically: GET, HEAD, POST, PUT and DELETE.
 */
export class BasePermissionsExtractor extends PermissionsExtractor {
  public async canHandle(input: Operation): Promise<void> {
    if (!/^(?:HEAD|GET|POST|PUT|DELETE)$/u.test(input.method)) {
      throw new UnsupportedHttpError(`Unsupported method: ${input.method}`);
    }
  }

  public async handle(input: Operation): Promise<PermissionSet> {
    const requiredPermissions = {
      read: /^(?:HEAD|GET)$/u.test(input.method),
      append: false,
      write: /^(?:POST|PUT|DELETE)$/u.test(input.method),
    };

    const read = /^(?:HEAD|GET)$/u.test(input.method);
    const write = /^(?:POST|PUT|DELETE)$/u.test(input.method);

    // Since `append` is a specific type of write, it is true if `write` is true.
    const append = requiredPermissions.write;

    return { read, append, write };
  }
}
