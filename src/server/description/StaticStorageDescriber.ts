import type { NamedNode, Quad, Quad_Object, Term } from '@rdfjs/types';
import { DataFactory } from 'n3';
import { stringToTerm } from 'rdf-string';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { StorageDescriber } from './StorageDescriber';
import quad = DataFactory.quad;
import namedNode = DataFactory.namedNode;

/**
 * Adds a fixed set of triples to the storage description resource,
 * with the resource identifier as subject.
 *
 * This can be used to add descriptions that a storage always needs to have,
 * such as the `<> a pim:Storage` triple.
 */
export class StaticStorageDescriber extends StorageDescriber {
  private readonly terms: ReadonlyMap<NamedNode, Quad_Object[]>;

  public constructor(terms: Record<string, string | string[]>) {
    super();
    const termMap = new Map<NamedNode, Quad_Object[]>();
    for (const [ predicate, objects ] of Object.entries(terms)) {
      const predTerm = stringToTerm(predicate);
      if (predTerm.termType !== 'NamedNode') {
        throw new Error('Predicate needs to be a named node.');
      }
      const objTerms = (Array.isArray(objects) ? objects : [ objects ]).map((obj): Term => stringToTerm(obj));
      // `stringToTerm` can only generate valid term types
      termMap.set(predTerm, objTerms as Quad_Object[]);
    }
    this.terms = termMap;
  }

  public async handle(target: ResourceIdentifier): Promise<Quad[]> {
    const subject = namedNode(target.path);
    return [ ...this.generateTriples(subject) ];
  }

  private* generateTriples(subject: NamedNode): Iterable<Quad> {
    for (const [ predicate, objects ] of this.terms.entries()) {
      for (const object of objects) {
        yield quad(subject, predicate, object);
      }
    }
  }
}
