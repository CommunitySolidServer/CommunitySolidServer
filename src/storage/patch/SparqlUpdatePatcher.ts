import type { ActorInitSparql } from '@comunica/actor-init-sparql';
import { newEngine } from '@comunica/actor-init-sparql';
import type { IQueryResultUpdate } from '@comunica/actor-init-sparql/lib/ActorInitSparql-browser';
import type { Store } from 'n3';
import { DataFactory } from 'n3';
import { Algebra } from 'sparqlalgebrajs';
import type { Patch } from '../../http/representation/Patch';
import type { SparqlUpdatePatch } from '../../http/representation/SparqlUpdatePatch';
import { getLoggerFor } from '../../logging/LogUtil';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { readableToString } from '../../util/StreamUtil';
import type { RdfStorePatcherInput } from './RdfStorePatcher';
import { RdfStorePatcher } from './RdfStorePatcher';

/**
 * Supports application/sparql-update PATCH requests on RDF resources.
 *
 * Only DELETE/INSERT updates without variables are supported.
 */
export class SparqlUpdatePatcher extends RdfStorePatcher {
  protected readonly logger = getLoggerFor(this);

  private readonly engine: ActorInitSparql;

  public constructor() {
    super();
    this.engine = newEngine();
  }

  public async canHandle({ patch }: RdfStorePatcherInput): Promise<void> {
    if (!this.isSparqlUpdate(patch)) {
      throw new NotImplementedHttpError('Only SPARQL update patches are supported');
    }
  }

  public async handle({ identifier, patch, store }: RdfStorePatcherInput): Promise<Store> {
    // Verify the patch
    const op = (patch as SparqlUpdatePatch).algebra;

    // In case of a NOP we can skip everything
    if (op.type === Algebra.types.NOP) {
      return store;
    }

    this.validateUpdate(op);

    return this.patch({
      identifier,
      patch,
      store,
    });
  }

  private isSparqlUpdate(patch: Patch): patch is SparqlUpdatePatch {
    return typeof (patch as SparqlUpdatePatch).algebra === 'object';
  }

  private isDeleteInsert(op: Algebra.Operation): op is Algebra.DeleteInsert {
    return op.type === Algebra.types.DELETE_INSERT;
  }

  private isComposite(op: Algebra.Operation): op is Algebra.CompositeUpdate {
    return op.type === Algebra.types.COMPOSITE_UPDATE;
  }

  /**
   * Checks if the input operation is of a supported type (DELETE/INSERT or composite of those)
   */
  private validateUpdate(op: Algebra.Operation): void {
    if (this.isDeleteInsert(op)) {
      this.validateDeleteInsert(op);
    } else if (this.isComposite(op)) {
      this.validateComposite(op);
    } else {
      this.logger.warn(`Unsupported operation: ${op.type}`);
      throw new NotImplementedHttpError('Only DELETE/INSERT SPARQL update operations are supported');
    }
  }

  /**
   * Checks if the input DELETE/INSERT is supported.
   * This means: no GRAPH statements, no DELETE WHERE containing terms of type Variable.
   */
  private validateDeleteInsert(op: Algebra.DeleteInsert): void {
    const def = DataFactory.defaultGraph();
    const deletes = op.delete ?? [];
    const inserts = op.insert ?? [];
    if (!deletes.every((pattern): boolean => pattern.graph.equals(def))) {
      this.logger.warn('GRAPH statement in DELETE clause');
      throw new NotImplementedHttpError('GRAPH statements are not supported');
    }
    if (!inserts.every((pattern): boolean => pattern.graph.equals(def))) {
      this.logger.warn('GRAPH statement in INSERT clause');
      throw new NotImplementedHttpError('GRAPH statements are not supported');
    }
    if (!(typeof op.where === 'undefined' || op.where.type === Algebra.types.BGP)) {
      this.logger.warn('Non-BGP WHERE statements are not supported');
      throw new NotImplementedHttpError('Non-BGP WHERE statements are not supported');
    }
  }

  /**
   * Checks if the composite update only contains supported update components.
   */
  private validateComposite(op: Algebra.CompositeUpdate): void {
    for (const update of op.updates) {
      this.validateUpdate(update);
    }
  }

  /**
   * Apply the given algebra operation to the given identifier.
   */
  private async patch({ identifier, patch, store }: RdfStorePatcherInput): Promise<Store> {
    const result = store;
    this.logger.debug(`${result.size} quads in ${identifier.path}.`);

    // Run the query through Comunica
    const sparql = await readableToString(patch.data);
    const query = await this.engine.query(sparql,
      { sources: [ result ], baseIRI: identifier.path }) as IQueryResultUpdate;
    await query.updateResult;

    this.logger.debug(`${result.size} quads will be stored to ${identifier.path}.`);

    return result;
  }
}
