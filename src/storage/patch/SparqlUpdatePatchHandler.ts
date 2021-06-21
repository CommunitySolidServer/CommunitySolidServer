import type { Readable } from 'stream';
import { defaultGraph } from '@rdfjs/data-model';
import { Store } from 'n3';
import type { BaseQuad } from 'rdf-js';
import { someTerms } from 'rdf-terms';
import { Algebra } from 'sparqlalgebrajs';
import type { Patch } from '../../ldp/http/Patch';
import type { SparqlUpdatePatch } from '../../ldp/http/SparqlUpdatePatch';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { RepresentationConverter } from '../conversion/RepresentationConverter';
import { ConvertingPatchHandler } from './ConvertingPatchHandler';
import type { PatchHandlerArgs } from './PatchHandler';

/**
 * Supports application/sparql-update PATCH requests on RDF resources.
 *
 * Only DELETE/INSERT updates without variables are supported.
 */
export class SparqlUpdatePatchHandler extends ConvertingPatchHandler {
  protected readonly logger = getLoggerFor(this);

  public constructor(converter: RepresentationConverter, defaultType = 'text/turtle') {
    super(converter, INTERNAL_QUADS, defaultType);
  }

  public async canHandle({ patch }: PatchHandlerArgs): Promise<void> {
    if (!this.isSparqlUpdate(patch)) {
      throw new NotImplementedHttpError('Only SPARQL update patches are supported');
    }
  }

  public async handle(input: PatchHandlerArgs): Promise<ResourceIdentifier[]> {
    // Verify the patch
    const { patch } = input;
    const op = (patch as SparqlUpdatePatch).algebra;

    // In case of a NOP we can skip everything
    if (op.type === Algebra.types.NOP) {
      return [];
    }

    this.validateUpdate(op);

    // Only start conversion if we know the operation is valid
    return super.handle(input);
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
  protected async patch(input: PatchHandlerArgs, representation?: Representation): Promise<Representation> {
    const { identifier, patch } = input;
    const result = new Store<BaseQuad>();
    let metadata: RepresentationMetadata;

    if (representation) {
      ({ metadata } = representation);
      const importEmitter = result.import(representation.data);
      await new Promise((resolve, reject): void => {
        importEmitter.on('end', resolve);
        importEmitter.on('error', reject);
      });
      this.logger.debug(`${result.size} quads in ${identifier.path}.`);
    } else {
      metadata = new RepresentationMetadata(identifier, INTERNAL_QUADS);
    }

    this.applyOperation(result, (patch as SparqlUpdatePatch).algebra);
    this.logger.debug(`${result.size} quads will be stored to ${identifier.path}.`);

    return new BasicRepresentation(result.match() as Readable, metadata);
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
