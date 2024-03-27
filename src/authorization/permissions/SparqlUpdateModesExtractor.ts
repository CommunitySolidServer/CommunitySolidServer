import { Algebra } from 'sparqlalgebrajs';
import type { Operation } from '../../http/Operation';
import type { Representation } from '../../http/representation/Representation';
import type { SparqlUpdatePatch } from '../../http/representation/SparqlUpdatePatch';
import type { ResourceSet } from '../../storage/ResourceSet';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { IdentifierSetMultiMap } from '../../util/map/IdentifierMap';
import { ModesExtractor } from './ModesExtractor';
import type { AccessMap } from './Permissions';
import { AccessMode } from './Permissions';

/**
 * Generates permissions for a SPARQL DELETE/INSERT body.
 * Updates with only an INSERT can be done with just append permissions,
 * while DELETEs require write permissions as well.
 */
export class SparqlUpdateModesExtractor extends ModesExtractor {
  private readonly resourceSet: ResourceSet;

  /**
   * Certain permissions depend on the existence of the target resource.
   * The provided {@link ResourceSet} will be used for that.
   *
   * @param resourceSet - {@link ResourceSet} that can verify the target resource existence.
   */
  public constructor(resourceSet: ResourceSet) {
    super();
    this.resourceSet = resourceSet;
  }

  public async canHandle({ body }: Operation): Promise<void> {
    if (!this.isSparql(body)) {
      throw new NotImplementedHttpError('Cannot determine permissions of non-SPARQL patches.');
    }
    if (!this.isSupported(body.algebra)) {
      throw new NotImplementedHttpError('Can only determine permissions of a PATCH with DELETE/INSERT operations.');
    }
  }

  public async handle({ body, target }: Operation): Promise<AccessMap> {
    // Verified in `canHandle` call
    const update = (body as SparqlUpdatePatch).algebra as Algebra.DeleteInsert;
    const requiredModes: AccessMap = new IdentifierSetMultiMap();

    if (this.isNop(update)) {
      return requiredModes;
    }

    // Access modes inspired by the requirements on N3 Patch requests
    if (this.hasConditions(update)) {
      requiredModes.add(target, AccessMode.read);
    }
    if (this.hasInserts(update)) {
      requiredModes.add(target, AccessMode.append);
      if (!await this.resourceSet.hasResource(target)) {
        requiredModes.add(target, AccessMode.create);
      }
    }
    if (this.hasDeletes(update)) {
      requiredModes.add(target, AccessMode.read);
      requiredModes.add(target, AccessMode.write);
    }

    return requiredModes;
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

  private isDeleteInsert(op: Algebra.Operation): op is Algebra.DeleteInsert {
    return op.type === Algebra.types.DELETE_INSERT;
  }

  private isNop(op: Algebra.Operation): op is Algebra.Nop {
    return op.type === Algebra.types.NOP;
  }

  private hasConditions(update: Algebra.Update): boolean {
    if (this.isDeleteInsert(update)) {
      return Boolean(update.where && !this.isNop(update.where));
    }
    return (update as Algebra.CompositeUpdate).updates.some((op): boolean => this.hasConditions(op));
  }

  private hasInserts(update: Algebra.Update): boolean {
    if (this.isDeleteInsert(update)) {
      return Boolean(update.insert && update.insert.length > 0);
    }
    return (update as Algebra.CompositeUpdate).updates.some((op): boolean => this.hasInserts(op));
  }

  private hasDeletes(update: Algebra.Update): boolean {
    if (this.isDeleteInsert(update)) {
      return Boolean(update.delete && update.delete.length > 0);
    }
    return (update as Algebra.CompositeUpdate).updates.some((op): boolean => this.hasDeletes(op));
  }
}
