import { QueryEngine } from '@comunica/query-sparql';
import arrayifyStream from 'arrayify-stream';
import type { Store } from 'n3';
import type { Bindings, Quad, Term } from '@rdfjs/types';
import { mapTerms } from 'rdf-terms';
import { Generator, Wildcard } from 'sparqljs';
import type { SparqlGenerator } from 'sparqljs';
import { isN3Patch } from '../../http/representation/N3Patch';
import type { N3Patch } from '../../http/representation/N3Patch';
import type { RdfDatasetRepresentation } from '../../http/representation/RdfDatasetRepresentation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { uniqueQuads } from '../../util/QuadUtil';
import type { RdfStorePatcherInput } from './RdfStorePatcher';
import type { RepresentationPatcherInput } from './RepresentationPatcher';
import { RepresentationPatcher } from './RepresentationPatcher';

/**
 * Applies an N3 Patch to a representation, or creates a new one if required.
 * Follows all the steps from Solid, §5.3.1: https://solid.github.io/specification/protocol#n3-patch
 */
export class N3Patcher extends RepresentationPatcher<RdfDatasetRepresentation> {
  protected readonly logger = getLoggerFor(this);

  private readonly engine: QueryEngine;
  private readonly generator: SparqlGenerator;

  public constructor() {
    super();
    this.engine = new QueryEngine();
    this.generator = new Generator();
  }

  public async canHandle({ patch }: RepresentationPatcherInput<RdfDatasetRepresentation>): Promise<void> {
    if (!isN3Patch(patch)) {
      throw new NotImplementedHttpError('Only N3 Patch updates are supported');
    }
  }

  public async handle(input: RepresentationPatcherInput<RdfDatasetRepresentation>): Promise<RdfDatasetRepresentation> {
    if (!input.representation) {
      throw new InternalServerError('Patcher requires a representation as input.');
    }
    const store = input.representation.dataset;

    const patch = input.patch as N3Patch;

    // No work to be done if the patch is empty
    if (patch.deletes.length === 0 && patch.inserts.length === 0 && patch.conditions.length === 0) {
      this.logger.debug('Empty patch, returning input.');
      return input.representation;
    }

    await this.patch({
      identifier: input.identifier,
      patch,
      store,
    });
    return input.representation;
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
      const bindingsStream = await this.engine.queryBindings(sparql, { sources: [ source ], baseIRI: identifier.path });
      const bindings: Bindings[] = await arrayifyStream(bindingsStream);

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
      deletes = deletes.map((quad): Quad => mapTerms(quad, (term): Term =>
        term.termType === 'Variable' ? bindings[0].get(term)! : term));
      inserts = inserts.map((quad): Quad => mapTerms(quad, (term): Term =>
        term.termType === 'Variable' ? bindings[0].get(term)! : term));
    }

    return {
      ...patch,
      deletes,
      inserts,
      conditions: [],
    };
  }
}
