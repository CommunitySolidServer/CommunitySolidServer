import { newEngine } from '@comunica/actor-init-sparql';
import type { ActorInitSparql } from '@comunica/actor-init-sparql';
import type { IQueryResultBindings } from '@comunica/actor-init-sparql/lib/ActorInitSparql-browser';
import type { Store } from 'n3';
import type { Quad, Term } from 'rdf-js';
import { mapTerms } from 'rdf-terms';
import { Generator, Wildcard } from 'sparqljs';
import type { SparqlGenerator } from 'sparqljs';
import { isN3Patch } from '../../http/representation/N3Patch';
import type { N3Patch } from '../../http/representation/N3Patch';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { uniqueQuads } from '../../util/QuadUtil';
import type { RdfStorePatcherInput } from './RdfStorePatcher';
import { RdfStorePatcher } from './RdfStorePatcher';

/**
 * Applies an N3 Patch to a representation, or creates a new one if required.
 * Follows all the steps from Solid, §5.3.1: https://solid.github.io/specification/protocol#n3-patch
 */
export class N3Patcher extends RdfStorePatcher {
  protected readonly logger = getLoggerFor(this);

  private readonly engine: ActorInitSparql;
  private readonly generator: SparqlGenerator;

  public constructor() {
    super();
    this.engine = newEngine();
    this.generator = new Generator();
  }

  public async canHandle({ patch }: RdfStorePatcherInput): Promise<void> {
    if (!isN3Patch(patch)) {
      throw new NotImplementedHttpError('Only N3 Patch updates are supported');
    }
  }

  public async handle(input: RdfStorePatcherInput): Promise<Store> {
    const patch = input.patch as N3Patch;

    // No work to be done if the patch is empty
    if (patch.deletes.length === 0 && patch.inserts.length === 0 && patch.conditions.length === 0) {
      this.logger.debug('Empty patch, returning input.');
      return input.store;
    }

    return this.patch({
      identifier: input.identifier,
      patch,
      store: input.store,
    });
  }

  /**
   * Applies the given N3Patch to the store.
   * First the conditions are applied to find the necessary bindings,
   * which are then applied to generate the triples that need to be deleted and inserted.
   * After that the delete and insert operations are applied.
   */
  private async patch({ identifier, patch, store }: RdfStorePatcherInput): Promise<Store> {
    this.logger.debug(`${store.size} quads in ${identifier.path}.`);

    const { deletes, inserts } = await this.applyConditions(patch as N3Patch, identifier, store);

    // Apply deletes
    if (deletes.length > 0) {
      // There could potentially be duplicates after applying conditions,
      // which would result in an incorrect count.
      const uniqueDeletes = uniqueQuads(deletes);
      // Solid, §5.3.1: "The triples resulting from ?deletions are to be removed from the RDF dataset."
      const oldSize = store.size;
      store.removeQuads(uniqueDeletes);

      // Solid, §5.3.1: "If the set of triples resulting from ?deletions is non-empty and the dataset
      // does not contain all of these triples, the server MUST respond with a 409 status code."
      if (oldSize - store.size !== uniqueDeletes.length) {
        throw new ConflictHttpError(
          'The document does not contain all triples the N3 Patch requests to delete, which is required for patching.',
        );
      }
      this.logger.debug(`Deleted ${oldSize - store.size} quads from ${identifier.path}.`);
    }

    // Solid, §5.3.1: "The triples resulting from ?insertions are to be added to the RDF dataset,
    // with each blank node from ?insertions resulting in a newly created blank node."
    store.addQuads(inserts);

    this.logger.debug(`${store.size} total quads after patching ${identifier.path}.`);

    return store;
  }

  /**
   * Creates a new N3Patch where the conditions of the provided patch parameter are applied to its deletes and inserts.
   * Also does the necessary checks to make sure the conditions are valid for the given dataset.
   */
  private async applyConditions(patch: N3Patch, identifier: ResourceIdentifier, source: Store): Promise<N3Patch> {
    const { conditions } = patch;
    let { deletes, inserts } = patch;

    if (conditions.length > 0) {
      // Solid, §5.3.1: "If ?conditions is non-empty, find all (possibly empty) variable mappings
      // such that all of the resulting triples occur in the dataset."
      const sparql = this.generator.stringify({
        type: 'query',
        queryType: 'SELECT',
        variables: [ new Wildcard() ],
        prefixes: {},
        where: [{
          type: 'bgp',
          triples: conditions,
        }],
      });
      this.logger.debug(`Finding bindings using SPARQL query ${sparql}`);
      const query = await this.engine.query(sparql,
        { sources: [ source ], baseIRI: identifier.path }) as IQueryResultBindings;
      const bindings = await query.bindings();

      // Solid, §5.3.1: "If no such mapping exists, or if multiple mappings exist,
      // the server MUST respond with a 409 status code."
      if (bindings.length === 0) {
        throw new ConflictHttpError(
          'The document does not contain any matches for the N3 Patch solid:where condition.',
        );
      }
      if (bindings.length > 1) {
        throw new ConflictHttpError(
          'The document contains multiple matches for the N3 Patch solid:where condition, which is not allowed.',
        );
      }

      // Apply bindings to deletes/inserts
      // Note that Comunica binding keys start with a `?` while Variable terms omit that in their value
      deletes = deletes.map((quad): Quad => mapTerms<Quad>(quad, (term): Term =>
        term.termType === 'Variable' ? bindings[0].get(`?${term.value}`) : term));
      inserts = inserts.map((quad): Quad => mapTerms<Quad>(quad, (term): Term =>
        term.termType === 'Variable' ? bindings[0].get(`?${term.value}`) : term));
    }

    return {
      ...patch,
      deletes,
      inserts,
      conditions: [],
    };
  }
}
