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
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { CONTENT_TYPE } from '../../util/UriConstants';
import type { ResourceLocker } from '../ResourceLocker';
import type { ResourceStore } from '../ResourceStore';
import { PatchHandler } from './PatchHandler';

/**
 * PatchHandler that supports specific types of SPARQL updates.
 * Currently all DELETE/INSERT types are supported that have empty where bodies and no variables.
 */
export class SparqlUpdatePatchHandler extends PatchHandler {
  private readonly source: ResourceStore;
  private readonly locker: ResourceLocker;

  public constructor(source: ResourceStore, locker: ResourceLocker) {
    super();
    this.source = source;
    this.locker = locker;
  }

  public async canHandle(input: {identifier: ResourceIdentifier; patch: SparqlUpdatePatch}): Promise<void> {
    if (typeof input.patch.algebra !== 'object') {
      throw new UnsupportedHttpError('Only SPARQL update patch requests are supported.');
    }
  }

  public async handle(input: {identifier: ResourceIdentifier; patch: SparqlUpdatePatch}): Promise<void> {
    const op = input.patch.algebra;
    if (!this.isDeleteInsert(op)) {
      throw new UnsupportedHttpError('Only DELETE/INSERT SPARQL update operations are supported.');
    }

    const def = defaultGraph();
    const deletes = op.delete ?? [];
    const inserts = op.insert ?? [];

    if (!deletes.every((pattern): boolean => pattern.graph.equals(def))) {
      throw new UnsupportedHttpError('GRAPH statements are not supported.');
    }
    if (!inserts.every((pattern): boolean => pattern.graph.equals(def))) {
      throw new UnsupportedHttpError('GRAPH statements are not supported.');
    }
    if (op.where ?? deletes.some((pattern): boolean =>
      someTerms(pattern, (term): boolean => term.termType === 'Variable'))) {
      throw new UnsupportedHttpError('WHERE statements are not supported.');
    }

    const lock = await this.locker.acquire(input.identifier);
    const quads = await this.source.getRepresentation(input.identifier,
      { type: [{ value: INTERNAL_QUADS, weight: 1 }]});
    const store = new Store<BaseQuad>();
    const importEmitter = store.import(quads.data);
    await new Promise((resolve, reject): void => {
      importEmitter.on('end', resolve);
      importEmitter.on('error', reject);
    });
    store.removeQuads(deletes);
    store.addQuads(inserts);
    const metadata = new RepresentationMetadata(input.identifier.path, { [CONTENT_TYPE]: INTERNAL_QUADS });
    const representation: Representation = {
      binary: false,
      data: store.match() as Readable,
      metadata,
    };
    await this.source.setRepresentation(input.identifier, representation);

    await lock.release();
  }

  private isDeleteInsert(op: Algebra.Operation): op is Algebra.DeleteInsert {
    return op.type === Algebra.types.DELETE_INSERT;
  }
}
