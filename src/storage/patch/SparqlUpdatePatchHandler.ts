import type { Readable } from 'stream';
import { defaultGraph } from '@rdfjs/data-model';
import { Store } from 'n3';
import type { BaseQuad } from 'rdf-js';
import { someTerms } from 'rdf-terms';
import { Algebra } from 'sparqlalgebrajs';
import type { SparqlUpdatePatch } from '../../ldp/http/SparqlUpdatePatch';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { guardStream } from '../../util/GuardedStream';
import type { ResourceLocker } from '../../util/locking/ResourceLocker';
import { CONTENT_TYPE } from '../../util/Vocabularies';
import type { ResourceStore } from '../ResourceStore';
import { PatchHandler } from './PatchHandler';

/**
 * PatchHandler that supports specific types of SPARQL updates.
 * Currently all DELETE/INSERT types are supported that have empty where bodies and no variables.
 */
export class SparqlUpdatePatchHandler extends PatchHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly source: ResourceStore;
  private readonly locker: ResourceLocker;

  public constructor(source: ResourceStore, locker: ResourceLocker) {
    super();
    this.source = source;
    this.locker = locker;
  }

  public async canHandle(input: {identifier: ResourceIdentifier; patch: SparqlUpdatePatch}): Promise<void> {
    if (typeof input.patch.algebra !== 'object') {
      throw new NotImplementedHttpError('Only SPARQL update patch requests are supported');
    }
  }

  public async handle(input: {identifier: ResourceIdentifier; patch: SparqlUpdatePatch}): Promise<void> {
    // Verify the patch
    const { identifier, patch } = input;
    const op = patch.algebra;
    if (!this.isDeleteInsert(op)) {
      this.logger.warn(`Unsupported operation: ${op.type}`);
      throw new NotImplementedHttpError('Only DELETE/INSERT SPARQL update operations are supported');
    }

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
    if (op.where ?? deletes.some((pattern): boolean =>
      someTerms(pattern, (term): boolean => term.termType === 'Variable'))) {
      this.logger.warn('WHERE statements are not supported');
      throw new NotImplementedHttpError('WHERE statements are not supported');
    }

    const lock = await this.locker.acquire(identifier);
    try {
      await this.applyPatch(identifier, deletes, inserts);
    } finally {
      await lock.release();
    }
  }

  private isDeleteInsert(op: Algebra.Operation): op is Algebra.DeleteInsert {
    return op.type === Algebra.types.DELETE_INSERT;
  }

  /**
   * Applies the given deletes and inserts to the resource.
   */
  private async applyPatch(identifier: ResourceIdentifier, deletes: Algebra.Pattern[], inserts: Algebra.Pattern[]):
  Promise<void> {
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
      // In case the resource does not exist yet we want to create it
      if (!(error instanceof NotFoundHttpError)) {
        throw error;
      }
      this.logger.debug(`Patching new resource ${identifier.path}.`);
    }

    // Apply the patch
    store.removeQuads(deletes);
    store.addQuads(inserts);
    this.logger.debug(`Removed ${deletes.length} and added ${inserts.length} quads to ${identifier.path}.`);
    this.logger.debug(`${store.size} quads will be stored to ${identifier.path}.`);

    // Write the result
    const metadata = new RepresentationMetadata(identifier, { [CONTENT_TYPE]: INTERNAL_QUADS });
    const representation: Representation = {
      binary: false,
      data: guardStream(store.match() as Readable),
      metadata,
    };
    await this.source.setRepresentation(identifier, representation);
  }
}
