import { Algebra } from 'sparqlalgebrajs';
import type { Operation } from '../../http/Operation';
import type { Representation } from '../../http/representation/Representation';
import type { SparqlUpdatePatch } from '../../http/representation/SparqlUpdatePatch';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ModesExtractor } from './ModesExtractor';
import { AccessMode } from './Permissions';

/**
 * Generates permissions for a SPARQL DELETE/INSERT body.
 * Updates with only an INSERT can be done with just append permissions,
 * while DELETEs require write permissions as well.
 */
export class SparqlUpdateModesExtractor extends ModesExtractor {
  public async canHandle({ body }: Operation): Promise<void> {
    if (!this.isSparql(body)) {
      throw new NotImplementedHttpError('Cannot determine permissions of non-SPARQL patches.');
    }
    if (!this.isSupported(body.algebra)) {
      throw new NotImplementedHttpError('Can only determine permissions of a PATCH with DELETE/INSERT operations.');
    }
  }

  public async handle({ body }: Operation): Promise<Set<AccessMode>> {
    // Verified in `canHandle` call
    const update = (body as SparqlUpdatePatch).algebra as Algebra.DeleteInsert;
    const result = new Set<AccessMode>();

    // Since `append` is a specific type of write, it is true if `write` is true.
    if (this.needsWrite(update)) {
      result.add(AccessMode.write);
      result.add(AccessMode.append);
      result.add(AccessMode.create);
      result.add(AccessMode.delete);
    } else if (this.needsAppend(update)) {
      result.add(AccessMode.append);
    }
    return result;
  }

  private isSparql(data: Representation): data is SparqlUpdatePatch {
    return Boolean((data as SparqlUpdatePatch).algebra);
  }

  private isSupported(op: Algebra.Update): boolean {
    if (this.isDeleteInsert(op) || this.isNop(op)) {
      return true;
    }
    if (op.type === Algebra.types.COMPOSITE_UPDATE) {
      return op.updates.every((update): boolean => this.isSupported(update));
    }
    return false;
  }

  private isDeleteInsert(op: Algebra.Update): op is Algebra.DeleteInsert {
    return op.type === Algebra.types.DELETE_INSERT;
  }

  private isNop(op: Algebra.Update): op is Algebra.Nop {
    return op.type === Algebra.types.NOP;
  }

  private needsAppend(update: Algebra.Update): boolean {
    if (this.isNop(update)) {
      return false;
    }
    if (this.isDeleteInsert(update)) {
      return Boolean(update.insert && update.insert.length > 0);
    }

    return (update as Algebra.CompositeUpdate).updates.some((op): boolean => this.needsAppend(op));
  }

  private needsWrite(update: Algebra.Update): boolean {
    if (this.isNop(update)) {
      return false;
    }
    if (this.isDeleteInsert(update)) {
      return Boolean(update.delete && update.delete.length > 0);
    }

    return (update as Algebra.CompositeUpdate).updates.some((op): boolean => this.needsWrite(op));
  }
}
