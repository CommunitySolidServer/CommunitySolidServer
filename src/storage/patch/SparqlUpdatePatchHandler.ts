import type { Readable } from 'stream';
import { defaultGraph } from '@rdfjs/data-model';
import { Store } from 'n3';
import type { BaseQuad } from 'rdf-js';
import { someTerms } from 'rdf-terms';
import { Algebra } from 'sparqlalgebrajs';
import type { SparqlUpdatePatch } from '../../ldp/http/SparqlUpdatePatch';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { ResourceStore } from '../ResourceStore';
import { PatchHandler } from './PatchHandler';

/**
 * PatchHandler that supports specific types of SPARQL updates.
 * Currently all DELETE/INSERT types are supported that have empty where bodies and no variables.
 */
export class SparqlUpdatePatchHandler extends PatchHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly source: ResourceStore;

  public constructor(source: ResourceStore) {
    super();
    this.source = source;
  }

  public async canHandle(input: {identifier: ResourceIdentifier; patch: SparqlUpdatePatch}): Promise<void> {
    if (typeof input.patch.algebra !== 'object') {
      throw new NotImplementedHttpError('Only SPARQL update patch requests are supported');
    }
  }

  public async handle(input: {identifier: ResourceIdentifier; patch: SparqlUpdatePatch}):
  Promise<ResourceIdentifier[]> {
    // Verify the patch
    const { identifier, patch } = input;
    const op = patch.algebra;
    this.validateUpdate(op);

    await this.applyPatch(identifier, op);
    return [ identifier ];
  }

  private isDeleteInsert(op: Algebra.Operation): op is Algebra.DeleteInsert {
    return op.type === Algebra.types.DELETE_INSERT;
  }

  private isComposite(op: Algebra.Operation): op is Algebra.CompositeUpdate {
    return op.type === Algebra.types.COMPOSITE_UPDATE;
  }

  private isBasicGraphPatternWithoutVariables(op: Algebra.Operation): op is Algebra.Bgp {
    if (op.type !== Algebra.types.BGP) {
      return false;
    }
    return !(op.patterns as BaseQuad[]).some((pattern): boolean =>
      someTerms(pattern, (term): boolean => term.termType === 'Variable'));
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
    const def = defaultGraph();
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
    if (!(typeof op.where === 'undefined' || this.isBasicGraphPatternWithoutVariables(op.where))) {
      this.logger.warn('WHERE statements are not supported');
      throw new NotImplementedHttpError('WHERE statements are not supported');
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
  private async applyPatch(identifier: ResourceIdentifier, op: Algebra.Operation): Promise<void> {
    const store = new Store<BaseQuad>();
    try {
      // Read the quads of the current representation
      const quads = await this.source.getRepresentation(identifier,
        { type: { [INTERNAL_QUADS]: 1 }});
      const importEmitter = store.import(quads.data);
      await new Promise((resolve, reject): void => {
        importEmitter.on('end', resolve);
        importEmitter.on('error', reject);
      });
      this.logger.debug(`${store.size} quads in ${identifier.path}.`);
    } catch (error: unknown) {
      // Solid, §5.1: "Clients who want to assign a URI to a resource, MUST use PUT and PATCH requests."
      // https://solid.github.io/specification/protocol#resource-type-heuristics
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      this.logger.debug(`Patching new resource ${identifier.path}.`);
    }

    this.applyOperation(store, op);
    this.logger.debug(`${store.size} quads will be stored to ${identifier.path}.`);

    // Write the result
    await this.source.setRepresentation(identifier, new BasicRepresentation(store.match() as Readable, INTERNAL_QUADS));
  }

  /**
   * Apply the given algebra update operation to the store of quads.
   */
  private applyOperation(store: Store<BaseQuad>, op: Algebra.Operation): void {
    if (this.isDeleteInsert(op)) {
      this.applyDeleteInsert(store, op);
    // Only other options is Composite after passing `validateUpdate`
    } else {
      this.applyComposite(store, op as Algebra.CompositeUpdate);
    }
  }

  /**
   * Apply the given composite update operation to the store of quads.
   */
  private applyComposite(store: Store<BaseQuad>, op: Algebra.CompositeUpdate): void {
    for (const update of op.updates) {
      this.applyOperation(store, update);
    }
  }

  /**
   * Apply the given DELETE/INSERT update operation to the store of quads.
   */
  private applyDeleteInsert(store: Store<BaseQuad>, op: Algebra.DeleteInsert): void {
    const deletes = op.delete ?? [];
    const inserts = op.insert ?? [];
    store.removeQuads(deletes);
    store.addQuads(inserts);
    this.logger.debug(`Removed ${deletes.length} and added ${inserts.length} quads.`);
  }
}
