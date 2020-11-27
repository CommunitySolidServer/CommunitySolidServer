import { getLoggerFor } from '../../logging/LogUtil';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { Operation } from '../operations/Operation';
import type { PermissionSet } from './PermissionSet';
import { PermissionsExtractor } from './PermissionsExtractor';

const READ_METHODS = new Set([ 'GET', 'HEAD' ]);
const WRITE_METHODS = new Set([ 'POST', 'PUT', 'DELETE' ]);
const SUPPORTED_METHODS = new Set([ ...READ_METHODS, ...WRITE_METHODS ]);

/**
 * Generates permissions for the base set of methods that always require the same permissions.
 * Specifically: GET, HEAD, POST, PUT and DELETE.
 */
export class MethodPermissionsExtractor extends PermissionsExtractor {
  protected readonly logger = getLoggerFor(this);

  public async canHandle({ method }: Operation): Promise<void> {
    if (!SUPPORTED_METHODS.has(method)) {
      this.logger.warn(`Unrecognized method ${method}`);
      throw new NotImplementedHttpError(`Cannot determine permissions of ${method}`);
    }
  }

  public async handle({ method }: Operation): Promise<PermissionSet> {
    const read = READ_METHODS.has(method);
    const write = WRITE_METHODS.has(method);
    return { read, write, append: write };
  }
}
