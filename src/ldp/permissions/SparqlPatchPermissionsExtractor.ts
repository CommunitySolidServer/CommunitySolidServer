import { Algebra } from 'sparqlalgebrajs';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import type { SparqlUpdatePatch } from '../http/SparqlUpdatePatch';
import type { Operation } from '../operations/Operation';
import type { Representation } from '../representation/Representation';
import type { PermissionSet } from './PermissionSet';
import { PermissionsExtractor } from './PermissionsExtractor';

/**
 * Generates permissions for a SPARQL DELETE/INSERT patch.
 * Updates with only an INSERT can be done with just append permissions,
 * while DELETEs require write permissions as well.
 */
export class SparqlPatchPermissionsExtractor extends PermissionsExtractor {
  public async canHandle({ method, body }: Operation): Promise<void> {
    if (method !== 'PATCH') {
      throw new UnsupportedHttpError(`Cannot determine permissions of ${method}, only PATCH.`);
    }
    if (!body) {
      throw new UnsupportedHttpError('Cannot determine permissions of PATCH operations without a body.');
    }
    if (!this.isSparql(body)) {
      throw new UnsupportedHttpError('Cannot determine permissions of non-SPARQL patches.');
    }
    if (!this.isDeleteInsert(body.algebra)) {
      throw new UnsupportedHttpError('Cannot determine permissions of a PATCH without DELETE/INSERT.');
    }
  }

  public async handle({ body }: Operation): Promise<PermissionSet> {
    // Verified in `canHandle` call
    const update = (body as SparqlUpdatePatch).algebra as Algebra.DeleteInsert;

    // Since `append` is a specific type of write, it is true if `write` is true.
    const read = false;
    const write = this.needsWrite(update);
    const append = write || this.needsAppend(update);
    return { read, write, append };
  }

  private isSparql(data: Representation): data is SparqlUpdatePatch {
    return Boolean((data as SparqlUpdatePatch).algebra);
  }

  private isDeleteInsert(op: Algebra.Operation): op is Algebra.DeleteInsert {
    return op.type === Algebra.types.DELETE_INSERT;
  }

  private needsAppend(update: Algebra.DeleteInsert): boolean {
    return Boolean(update.insert && update.insert.length > 0);
  }

  private needsWrite(update: Algebra.DeleteInsert): boolean {
    return Boolean(update.delete && update.delete.length > 0);
  }
}
