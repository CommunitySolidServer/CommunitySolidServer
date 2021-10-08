import type { Operation } from '../../http/Operation';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ModesExtractor } from './ModesExtractor';
import { AccessMode } from './Permissions';

const READ_METHODS = new Set([ 'GET', 'HEAD' ]);
const WRITE_METHODS = new Set([ 'PUT', 'DELETE' ]);
const APPEND_METHODS = new Set([ 'POST' ]);
const SUPPORTED_METHODS = new Set([ ...READ_METHODS, ...WRITE_METHODS, ...APPEND_METHODS ]);

/**
 * Generates permissions for the base set of methods that always require the same permissions.
 * Specifically: GET, HEAD, POST, PUT and DELETE.
 */
export class MethodModesExtractor extends ModesExtractor {
  public async canHandle({ method }: Operation): Promise<void> {
    if (!SUPPORTED_METHODS.has(method)) {
      throw new NotImplementedHttpError(`Cannot determine permissions of ${method}`);
    }
  }

  public async handle({ method }: Operation): Promise<Set<AccessMode>> {
    const result = new Set<AccessMode>();
    if (READ_METHODS.has(method)) {
      result.add(AccessMode.read);
    }
    if (WRITE_METHODS.has(method)) {
      result.add(AccessMode.write);
      result.add(AccessMode.append);
      result.add(AccessMode.create);
      result.add(AccessMode.delete);
    } else if (APPEND_METHODS.has(method)) {
      result.add(AccessMode.append);
    }
    return result;
  }
}
