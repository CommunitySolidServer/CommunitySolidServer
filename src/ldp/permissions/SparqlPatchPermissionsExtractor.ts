import { Algebra } from 'sparqlalgebrajs';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
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
      throw new NotImplementedHttpError(`Cannot determine permissions of ${method}, only PATCH.`);
    }
    if (!body) {
      throw new NotImplementedHttpError('Cannot determine permissions of PATCH operations without a body.');
    }
    if (!this.isSparql(body)) {
      throw new NotImplementedHttpError('Cannot determine permissions of non-SPARQL patches.');
    }
    if (!this.isSupported(body.algebra)) {
      throw new NotImplementedHttpError('Can only determine permissions of a PATCH with DELETE/INSERT operations.');
    }
  }

  public async handle({ body }: Operation): Promise<PermissionSet> {
    // Verified in `canHandle` call
    const update = (body as SparqlUpdatePatch).algebra as Algebra.DeleteInsert;

    // Since `append` is a specific type of write, it is true if `write` is true.
    const read = false;
    const write = this.needsWrite(update);
    const append = write || this.needsAppend(update);
    const control = false;
    return { read, write, append, control };
  }

  private isSparql(data: Representation): data is SparqlUpdatePatch {
    return Boolean((data as SparqlUpdatePatch).algebra);
  }

  private isSupported(op: Algebra.Operation): boolean {
    if (op.type === Algebra.types.DELETE_INSERT) {
      return true;
    }
    if (op.type === Algebra.types.COMPOSITE_UPDATE) {
      return (op as Algebra.CompositeUpdate).updates.every((update): boolean => this.isSupported(update));
    }
    return false;
  }

  private isDeleteInsert(op: Algebra.Operation): op is Algebra.DeleteInsert {
    return op.type === Algebra.types.DELETE_INSERT;
  }

  private needsAppend(update: Algebra.Operation): boolean {
    if (this.isDeleteInsert(update)) {
      return Boolean(update.insert && update.insert.length > 0);
    }

    return (update as Algebra.CompositeUpdate).updates.some((op): boolean => this.needsAppend(op));
  }

  private needsWrite(update: Algebra.Operation): boolean {
    if (this.isDeleteInsert(update)) {
      return Boolean(update.delete && update.delete.length > 0);
    }

    return (update as Algebra.CompositeUpdate).updates.some((op): boolean => this.needsWrite(op));
  }
}
