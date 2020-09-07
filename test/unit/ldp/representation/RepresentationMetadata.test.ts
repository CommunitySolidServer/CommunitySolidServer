import { literal, namedNode, quad } from '@rdfjs/data-model';
import { Literal, NamedNode, Quad } from 'rdf-js';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';

describe('A RepresentationMetadata', (): void => {
  let metadata: RepresentationMetadata;
  const identifier = namedNode('http://example.com/id');
  const inputQuads = [
    quad(identifier, namedNode('has'), literal('data')),
    quad(identifier, namedNode('has'), literal('moreData')),
    quad(identifier, namedNode('hasOne'), literal('otherData')),
    quad(namedNode('otherNode'), namedNode('linksTo'), identifier),
    quad(namedNode('otherNode'), namedNode('has'), literal('otherData')),
  ];

  describe('constructor', (): void => {
    it('creates a blank node if no identifier was given.', async(): Promise<void> => {
      metadata = new RepresentationMetadata();
      expect(metadata.identifier.termType).toEqual('BlankNode');
      expect(metadata.quads()).toHaveLength(0);
    });

    it('stores the given identifier if given.', async(): Promise<void> => {
      metadata = new RepresentationMetadata(namedNode('identifier'));
      expect(metadata.identifier).toEqualRdfTerm(namedNode('identifier'));
    });

    it('converts identifier strings to named nodes.', async(): Promise<void> => {
      metadata = new RepresentationMetadata('identifier');
      expect(metadata.identifier).toEqualRdfTerm(namedNode('identifier'));
    });

    it('stores input quads.', async(): Promise<void> => {
      metadata = new RepresentationMetadata(identifier, inputQuads);
      expect(metadata.quads()).toBeRdfIsomorphic(inputQuads);
    });
  });

  describe('instantiated', (): void => {
    beforeEach(async(): Promise<void> => {
      metadata = new RepresentationMetadata(identifier, inputQuads);
    });

    it('can change the stored identifier.', async(): Promise<void> => {
      const newIdentifier = namedNode('newNode');
      metadata.identifier = newIdentifier;
      const newQuads = inputQuads.map((triple): Quad => {
        if (triple.subject.equals(identifier)) {
          return quad(newIdentifier, triple.predicate, triple.object);
        }
        if (triple.object.equals(identifier)) {
          return quad(triple.subject, triple.predicate, newIdentifier);
        }
        return triple;
      });
      expect(metadata.identifier).toEqualRdfTerm(newIdentifier);
      expect(metadata.quads()).toBeRdfIsomorphic(newQuads);
    });

    it('can add quads.', async(): Promise<void> => {
      const newQuads: Quad[] = [
        quad(namedNode('random'), namedNode('new'), namedNode('triple')),
      ];
      metadata.addQuads(newQuads);
      expect(metadata.quads()).toBeRdfIsomorphic(newQuads.concat(inputQuads));
    });

    it('can remove quads.', async(): Promise<void> => {
      metadata.removeQuads([ inputQuads[0] ]);
      expect(metadata.quads()).toBeRdfIsomorphic(inputQuads.slice(1));
    });

    it('can add a single value for a predicate.', async(): Promise<void> => {
      const newQuad = quad(identifier, namedNode('new'), namedNode('triple'));
      metadata.add(newQuad.predicate as NamedNode, newQuad.object as NamedNode);
      expect(metadata.quads()).toBeRdfIsomorphic([ newQuad ].concat(inputQuads));
    });

    it('can add single values as string.', async(): Promise<void> => {
      const newQuad = quad(identifier, namedNode('new'), literal('triple'));
      metadata.add(newQuad.predicate as NamedNode, newQuad.object.value);
      expect(metadata.quads()).toBeRdfIsomorphic([ newQuad ].concat(inputQuads));
    });

    it('can remove a single value for a predicate.', async(): Promise<void> => {
      metadata.remove(inputQuads[0].predicate as NamedNode, inputQuads[0].object as Literal);
      expect(metadata.quads()).toBeRdfIsomorphic(inputQuads.slice(1));
    });

    it('can remove single values as string.', async(): Promise<void> => {
      metadata.remove(inputQuads[0].predicate as NamedNode, inputQuads[0].object.value);
      expect(metadata.quads()).toBeRdfIsomorphic(inputQuads.slice(1));
    });

    it('can remove all values for a predicate.', async(): Promise<void> => {
      const pred = namedNode('has');
      metadata.removeAll(pred);
      const updatedNodes = inputQuads.filter((triple): boolean =>
        !triple.subject.equals(identifier) || !triple.predicate.equals(pred));
      expect(metadata.quads()).toBeRdfIsomorphic(updatedNodes);
    });

    it('can get the single value for a predicate.', async(): Promise<void> => {
      expect(metadata.get(namedNode('hasOne'))).toEqualRdfTerm(literal('otherData'));
    });

    it('returns undefined if getting an undefined predicate.', async(): Promise<void> => {
      expect(metadata.get(namedNode('doesntExist'))).toBeUndefined();
    });

    it('errors if there are multiple values when getting a value.', async(): Promise<void> => {
      expect((): any => metadata.get(namedNode('has'))).toThrow(Error);
    });

    it('can set the value of predicate.', async(): Promise<void> => {
      metadata.set(namedNode('has'), literal('singleValue'));
      expect(metadata.get(namedNode('has'))).toEqualRdfTerm(literal('singleValue'));
    });
  });
});
