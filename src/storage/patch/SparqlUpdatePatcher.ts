import { QueryEngine } from '@comunica/query-sparql';
import type { Store } from 'n3';
import { DataFactory } from 'n3';
import { Algebra } from 'sparqlalgebrajs';
import type { Patch } from '../../http/representation/Patch';
import type { RdfDatasetRepresentation } from '../../http/representation/RdfDatasetRepresentation';
import type { SparqlUpdatePatch } from '../../http/representation/SparqlUpdatePatch';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { readableToString } from '../../util/StreamUtil';
import type { RdfStorePatcherInput } from './RdfStorePatcher';
import type { RepresentationPatcherInput } from './RepresentationPatcher';
import { RepresentationPatcher } from './RepresentationPatcher';

/**
 * Supports application/sparql-update PATCH requests on RDF resources.
 *
 * Only DELETE/INSERT updates without variables are supported.
 */
export class SparqlUpdatePatcher extends RepresentationPatcher<RdfDatasetRepresentation> {
  protected readonly logger = getLoggerFor(this);

  private readonly engine: QueryEngine;

  public constructor() {
    super();
    this.engine = new QueryEngine();
  }

  public async canHandle({ patch }: RepresentationPatcherInput<RdfDatasetRepresentation>): Promise<void> {
    if (!this.isSparqlUpdate(patch)) {
      throw new NotImplementedHttpError('Only SPARQL update patches are supported');
    }
  }

  public async handle({ identifier, patch, representation }: RepresentationPatcherInput<RdfDatasetRepresentation>):
  Promise<RdfDatasetRepresentation> {
    // Verify the patch
    const op = (patch as SparqlUpdatePatch).algebra;

    if (!representation) {
      throw new InternalServerError('Patcher requires a representation as input.');
    }
    const store = representation.dataset;

    // In case of a NOP we can skip everything
    if (op.type === Algebra.types.NOP) {
      return representation;
    }

    this.validateUpdate(op);
    await this.patch({
      identifier,
      patch,
      store,
    });
    return representation;
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
    await this.engine.queryVoid(sparql, { sources: [ result ], baseIRI: identifier.path });

    this.logger.debug(`${result.size} quads will be stored to ${identifier.path}.`);

    return result;
  }
}
