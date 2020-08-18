import { Algebra } from 'sparqlalgebrajs';
import { Operation } from '../operations/Operation';
import { PermissionSet } from './PermissionSet';
import { PermissionsExtractor } from './PermissionsExtractor';
import { Representation } from '../representation/Representation';
import { SparqlUpdatePatch } from '../http/SparqlUpdatePatch';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';

/**
 * Generates permissions for a SPARQL DELETE/INSERT patch.
 * Updates with only an INSERT can be done with just append permissions,
 * while DELETEs require write permissions as well.
 */
export class SparqlPatchPermissionsExtractor extends PermissionsExtractor {
  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'PATCH') {
      throw new UnsupportedHttpError('Only PATCH operations are supported.');
    }
    if (!input.body) {
      throw new UnsupportedHttpError('PATCH body is required to determine permissions.');
    }
    if (!this.isSparql(input.body)) {
      throw new UnsupportedHttpError('Only SPARQL update PATCHes are supported.');
    }
    if (!this.isDeleteInsert(input.body.algebra)) {
      throw new UnsupportedHttpError('Only DELETE/INSERT SPARQL update operations are supported.');
    }
  }

  public async handle(input: Operation): Promise<PermissionSet> {
    // Verified in `canHandle` call
    const op = (input.body as SparqlUpdatePatch).algebra as Algebra.DeleteInsert;

    const read = false;
    const write = this.needsWrite(op);

    // Since `append` is a specific type of write, it is true if `write` is true.
    const append = write || this.needsAppend(op);

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
