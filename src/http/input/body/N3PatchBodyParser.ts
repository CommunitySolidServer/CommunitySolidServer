import type { NamedNode, Quad, Quad_Subject, Variable } from '@rdfjs/types';
import { DataFactory, Parser, Store } from 'n3';
import { getBlankNodes, getTerms, getVariables } from 'rdf-terms';
import { TEXT_N3 } from '../../../util/ContentTypes';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { UnprocessableEntityHttpError } from '../../../util/errors/UnprocessableEntityHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../util/errors/UnsupportedMediaTypeHttpError';
import { guardedStreamFrom, readableToString } from '../../../util/StreamUtil';
import { RDF, SOLID } from '../../../util/Vocabularies';
import type { N3Patch } from '../../representation/N3Patch';
import type { BodyParserArgs } from './BodyParser';
import { BodyParser } from './BodyParser';

const defaultGraph = DataFactory.defaultGraph();

/**
 * Parses an N3 Patch document and makes sure it conforms to the specification requirements.
 * Requirements can be found at Solid Protocol, §5.3.1: https://solid.github.io/specification/protocol#n3-patch
 */
export class N3PatchBodyParser extends BodyParser {
  public async canHandle({ metadata }: BodyParserArgs): Promise<void> {
    if (metadata.contentType !== TEXT_N3) {
      throw new UnsupportedMediaTypeHttpError('This parser only supports N3 Patch documents.');
    }
  }

  public async handle({ request, metadata }: BodyParserArgs): Promise<N3Patch> {
    const n3 = await readableToString(request);
    const parser = new Parser({ format: TEXT_N3, baseIRI: metadata.identifier.value });
    let store: Store;
    try {
      store = new Store(parser.parse(n3));
    } catch (error: unknown) {
      throw new BadRequestHttpError(`Invalid N3: ${createErrorMessage(error)}`, { cause: error });
    }

    // Solid, §5.3.1: "A patch resource MUST contain a triple ?patch rdf:type solid:InsertDeletePatch."
    // "The patch document MUST contain exactly one patch resource,
    // identified by one or more of the triple patterns described above, which all share the same ?patch subject."
    const patches = store.getSubjects(RDF.terms.type, SOLID.terms.InsertDeletePatch, defaultGraph);
    if (patches.length !== 1) {
      throw new UnprocessableEntityHttpError(
        `This patcher only supports N3 Patch documents with exactly 1 solid:InsertDeletePatch entry, but received ${
          patches.length}.`,
      );
    }
    return {
      ...this.parsePatch(patches[0], store),
      binary: true,
      data: guardedStreamFrom(n3),
      metadata,
      isEmpty: false,
    };
  }

  /**
   * Extracts the deletes/inserts/conditions from a solid:InsertDeletePatch entry.
   */
  private parsePatch(patch: Quad_Subject, store: Store): { deletes: Quad[]; inserts: Quad[]; conditions: Quad[] } {
    // Solid, §5.3.1: "A patch resource MUST be identified by a URI or blank node, which we refer to as ?patch
    // in the remainder of this section."
    if (patch.termType !== 'NamedNode' && patch.termType !== 'BlankNode') {
      throw new UnprocessableEntityHttpError('An N3 Patch subject needs to be a blank or named node.');
    }

    // Extract all quads from the corresponding formulae
    const deletes = this.findQuads(store, patch, SOLID.terms.deletes);
    const inserts = this.findQuads(store, patch, SOLID.terms.inserts);
    const conditions = this.findQuads(store, patch, SOLID.terms.where);

    // Make sure there are no forbidden combinations
    const conditionVars = this.findVariables(conditions);
    this.verifyQuads(deletes, conditionVars);
    this.verifyQuads(inserts, conditionVars);

    return { deletes, inserts, conditions };
  }

  /**
   * Finds all quads in a where/deletes/inserts formula.
   * The returned quads will be updated so their graph is the default graph instead of the N3 reference to the formula.
   * Will error in case there are multiple instances of the subject/predicate combination.
   */
  private findQuads(store: Store, subject: Quad_Subject, predicate: NamedNode): Quad[] {
    const graphs = store.getObjects(subject, predicate, defaultGraph);
    if (graphs.length > 1) {
      throw new UnprocessableEntityHttpError(`An N3 Patch can have at most 1 ${predicate.value}.`);
    }
    if (graphs.length === 0) {
      return [];
    }
    // This might not return all quads in case of nested formulae,
    // but these are not allowed and will throw an error later when checking for blank nodes.
    // Another check would be needed in case blank nodes are allowed in the future.
    const quads: Quad[] = store.getQuads(null, null, null, graphs[0]);

    // Remove the graph references so they can be interpreted as standard triples
    // independent of the formula they were in.
    return quads.map((quad): Quad => DataFactory.quad(quad.subject, quad.predicate, quad.object, defaultGraph));
  }

  /**
   * Finds all variables in a set of quads.
   */
  private findVariables(quads: Quad[]): Set<string> {
    return new Set(
      quads.flatMap((quad): Variable[] => getVariables(getTerms(quad)))
        .map((variable): string => variable.value),
    );
  }

  /**
   * Verifies if the delete/insert triples conform to the specification requirements:
   *  - They should not contain blank nodes.
   *  - They should not contain variables that do not occur in the conditions.
   */
  private verifyQuads(otherQuads: Quad[], conditionVars: Set<string>): void {
    for (const quad of otherQuads) {
      const terms = getTerms(quad);
      const blankNodes = getBlankNodes(terms);
      // Solid, §5.3.1: "The ?insertions and ?deletions formulae MUST NOT contain blank nodes."
      if (blankNodes.length > 0) {
        throw new UnprocessableEntityHttpError(`An N3 Patch delete/insert formula can not contain blank nodes.`);
      }
      const variables = getVariables(terms);
      for (const variable of variables) {
        // Solid, §5.3.1: "The ?insertions and ?deletions formulae
        // MUST NOT contain variables that do not occur in the ?conditions formula."
        if (!conditionVars.has(variable.value)) {
          throw new UnprocessableEntityHttpError(
            `An N3 Patch delete/insert formula can only contain variables found in the conditions formula.`,
          );
        }
      }
    }
  }
}
