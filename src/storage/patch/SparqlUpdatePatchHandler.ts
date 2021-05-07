import type { Readable } from 'stream';
import { defaultGraph } from '@rdfjs/data-model';
import { Store } from 'n3';
import type { BaseQuad } from 'rdf-js';
import { someTerms } from 'rdf-terms';
import { Algebra } from 'sparqlalgebrajs';
import type { Patch } from '../../ldp/http/Patch';
import type { SparqlUpdatePatch } from '../../ldp/http/SparqlUpdatePatch';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { RepresentationConverter } from '../conversion/RepresentationConverter';
import type { ResourceStore } from '../ResourceStore';
import type { PatchHandlerArgs } from './PatchHandler';
import { PatchHandler } from './PatchHandler';

/**
 * PatchHandler that supports specific types of SPARQL updates.
 * Currently all DELETE/INSERT types are supported that have empty where bodies and no variables.
 *
 * Will try to keep the content-type and metadata of the original resource intact.
 * In case this PATCH would create a new resource, it will have content-type `defaultType`.
 */
export class SparqlUpdatePatchHandler extends PatchHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly converter: RepresentationConverter;
  private readonly defaultType: string;

  public constructor(converter: RepresentationConverter, defaultType = 'text/turtle') {
    super();
    this.converter = converter;
    this.defaultType = defaultType;
  }

  public async canHandle({ patch }: PatchHandlerArgs): Promise<void> {
    if (!this.isSparqlUpdate(patch)) {
      throw new NotImplementedHttpError('Only SPARQL update patches are supported');
    }
  }

  public async handle(input: PatchHandlerArgs): Promise<ResourceIdentifier[]> {
    // Verify the patch
    const { source, identifier, patch } = input;
    const op = (patch as SparqlUpdatePatch).algebra;
    this.validateUpdate(op);

    return this.applyPatch(source, identifier, op);
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
  private async applyPatch(source: ResourceStore, identifier: ResourceIdentifier, op: Algebra.Operation):
  Promise<ResourceIdentifier[]> {
    // These are used to make sure we keep the original content-type and metadata
    let contentType: string;
    let metadata: RepresentationMetadata;

    const result = new Store<BaseQuad>();
    try {
      // Read the quads of the current representation
      const representation = await source.getRepresentation(identifier, {});
      contentType = representation.metadata.contentType ?? this.defaultType;
      const preferences = { type: { [INTERNAL_QUADS]: 1 }};
      const quads = await this.converter.handleSafe({ representation, identifier, preferences });
      // eslint-disable-next-line prefer-destructuring
      metadata = quads.metadata;

      const importEmitter = result.import(quads.data);
      await new Promise((resolve, reject): void => {
        importEmitter.on('end', resolve);
        importEmitter.on('error', reject);
      });
      this.logger.debug(`${result.size} quads in ${identifier.path}.`);
    } catch (error: unknown) {
      // Solid, §5.1: "When a successful PUT or PATCH request creates a resource,
      // the server MUST use the effective request URI to assign the URI to that resource."
      // https://solid.github.io/specification/protocol#resource-type-heuristics
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      contentType = this.defaultType;
      metadata = new RepresentationMetadata(identifier, INTERNAL_QUADS);
      this.logger.debug(`Patching new resource ${identifier.path}.`);
    }

    this.applyOperation(result, op);
    this.logger.debug(`${result.size} quads will be stored to ${identifier.path}.`);

    // Convert back to the original type and write the result
    const patched = new BasicRepresentation(result.match() as Readable, metadata);
    const converted = await this.converter.handleSafe({
      representation: patched,
      identifier,
      preferences: { type: { [contentType]: 1 }},
    });
    return source.setRepresentation(identifier, converted);
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
