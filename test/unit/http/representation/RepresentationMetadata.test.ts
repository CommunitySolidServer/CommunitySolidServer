import 'jest-rdf';
import type { BlankNode } from 'n3';
import { DataFactory } from 'n3';
import type { NamedNode, Quad } from 'rdf-js';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { CONTENT_TYPE, SOLID_META, RDFS } from '../../../../src/util/Vocabularies';
const { defaultGraph, literal, namedNode, quad } = DataFactory;

// Helper functions to filter quads
function getQuads(quads: Quad[], subject?: string, predicate?: string, object?: string, graph?: string): Quad[] {
  return quads.filter((qq): boolean =>
    (!subject || qq.subject.value === subject) &&
    (!predicate || qq.predicate.value === predicate) &&
    (!object || qq.object.value === object) &&
    (!graph || qq.graph.value === graph));
}

function removeQuads(quads: Quad[], subject?: string, predicate?: string, object?: string, graph?: string): Quad[] {
  const filtered = getQuads(quads, subject, predicate, object, graph);
  return quads.filter((qq): boolean => !filtered.includes(qq));
}

describe('A RepresentationMetadata', (): void => {
  let metadata: RepresentationMetadata;
  const identifier = namedNode('http://example.com/id');
  const graphNode = namedNode('http://graph');
  const inputQuads = [
    quad(identifier, namedNode('has'), literal('data')),
    quad(identifier, namedNode('has'), literal('moreData')),
    quad(identifier, namedNode('hasOne'), literal('otherData')),
    quad(identifier, namedNode('has'), literal('data'), graphNode),
    quad(namedNode('otherNode'), namedNode('linksTo'), identifier),
    quad(namedNode('otherNode'), namedNode('has'), literal('otherData')),
    quad(namedNode('otherNode'), namedNode('graphData'), literal('otherData'), graphNode),
  ];

  describe('constructor', (): void => {
    it('creates a blank node if no identifier was given.', async(): Promise<void> => {
      metadata = new RepresentationMetadata();
      expect(metadata.identifier.termType).toBe('BlankNode');
      expect(metadata.quads()).toHaveLength(0);
    });

    it('stores the given identifier if given.', async(): Promise<void> => {
      metadata = new RepresentationMetadata(namedNode('identifier'));
      expect(metadata.identifier).toEqualRdfTerm(namedNode('identifier'));
    });

    it('converts identifiers to named nodes.', async(): Promise<void> => {
      metadata = new RepresentationMetadata({ path: 'identifier' });
      expect(metadata.identifier).toEqualRdfTerm(namedNode('identifier'));
    });

    it('converts string to content type.', async(): Promise<void> => {
      metadata = new RepresentationMetadata('text/turtle');
      expect(metadata.contentType).toBe('text/turtle');

      metadata = new RepresentationMetadata({ path: 'identifier' }, 'text/turtle');
      expect(metadata.contentType).toBe('text/turtle');

      metadata = new RepresentationMetadata(new RepresentationMetadata(), 'text/turtle');
      expect(metadata.contentType).toBe('text/turtle');
    });

    it('stores the content-length correctly.', async(): Promise<void> => {
      metadata = new RepresentationMetadata();
      metadata.contentLength = 50;
      expect(metadata.contentLength).toBe(50);

      metadata = new RepresentationMetadata();
      metadata.contentLength = undefined;
      expect(metadata.contentLength).toBeUndefined();
    });

    it('copies an other metadata object.', async(): Promise<void> => {
      const other = new RepresentationMetadata({ path: 'otherId' }, { 'test:pred': 'objVal' });
      metadata = new RepresentationMetadata(other);
      expect(metadata.identifier).toEqualRdfTerm(namedNode('otherId'));
      expect(metadata.quads()).toBeRdfIsomorphic([
        quad(namedNode('otherId'), namedNode('test:pred'), literal('objVal')) ]);
    });

    it('takes overrides for specific predicates.', async(): Promise<void> => {
      metadata = new RepresentationMetadata({ predVal: 'objVal' });
      expect(metadata.get('predVal')).toEqualRdfTerm(literal('objVal'));

      metadata = new RepresentationMetadata({ predVal: literal('objVal') });
      expect(metadata.get('predVal')).toEqualRdfTerm(literal('objVal'));

      metadata = new RepresentationMetadata({ predVal: [ 'objVal1', literal('objVal2') ], predVal2: 'objVal3' });
      expect(metadata.getAll('predVal')).toEqualRdfTermArray([ literal('objVal1'), literal('objVal2') ]);
      expect(metadata.get('predVal2')).toEqualRdfTerm(literal('objVal3'));
    });

    it('can combine overrides with an identifier.', async(): Promise<void> => {
      metadata = new RepresentationMetadata(identifier, { predVal: 'objVal' });
      expect(metadata.quads()).toBeRdfIsomorphic([
        quad(identifier, namedNode('predVal'), literal('objVal')) ]);
    });

    it('can combine overrides with other metadata.', async(): Promise<void> => {
      const other = new RepresentationMetadata({ path: 'otherId' }, { 'test:pred': 'objVal' });
      metadata = new RepresentationMetadata(other, { 'test:pred': 'objVal2' });
      expect(metadata.quads()).toBeRdfIsomorphic([
        quad(namedNode('otherId'), namedNode('test:pred'), literal('objVal2')) ]);
    });
  });

  describe('instantiated', (): void => {
    beforeEach(async(): Promise<void> => {
      metadata = new RepresentationMetadata(identifier).addQuads(inputQuads);
    });

    it('can get all quads.', async(): Promise<void> => {
      expect(metadata.quads()).toBeRdfIsomorphic(inputQuads);
    });

    it('can query quads.', async(): Promise<void> => {
      expect(metadata.quads(null, namedNode('has'))).toHaveLength(getQuads(inputQuads, undefined, 'has').length);
      expect(metadata.quads(null, null, literal('otherData')))
        .toHaveLength(getQuads(inputQuads, undefined, undefined, 'otherData').length);
    });

    it('can change the stored identifier.', async(): Promise<void> => {
      const newIdentifier = namedNode('newNode');
      metadata.identifier = newIdentifier;
      const newQuads = inputQuads.map((triple): Quad => {
        if (triple.subject.equals(identifier)) {
          return quad(newIdentifier, triple.predicate, triple.object, triple.graph);
        }
        if (triple.object.equals(identifier)) {
          return quad(triple.subject, triple.predicate, newIdentifier, triple.graph);
        }
        return triple;
      });
      expect(metadata.identifier).toEqualRdfTerm(newIdentifier);
      expect(metadata.quads()).toBeRdfIsomorphic(newQuads);
    });

    it('can copy metadata.', async(): Promise<void> => {
      const other = new RepresentationMetadata(identifier, { 'test:pred': 'objVal' });
      metadata.setMetadata(other);

      expect(metadata.identifier).toEqual(other.identifier);
      expect(metadata.quads()).toBeRdfIsomorphic([ ...inputQuads,
        quad(identifier, namedNode('test:pred'), literal('objVal')) ]);
    });

    it('updates its identifier when copying metadata.', async(): Promise<void> => {
      const other = new RepresentationMetadata({ path: 'otherId' }, { 'test:pred': 'objVal' });
      metadata.setMetadata(other);

      // `setMetadata` should have the same result as the following
      const expectedMetadata = new RepresentationMetadata(identifier).addQuads(inputQuads);
      expectedMetadata.identifier = namedNode('otherId');
      expectedMetadata.add('test:pred', 'objVal');

      expect(metadata.identifier).toEqual(other.identifier);
      expect(metadata.quads()).toBeRdfIsomorphic(expectedMetadata.quads());
    });

    it('can add a quad.', async(): Promise<void> => {
      const newQuad = quad(namedNode('random'), namedNode('new'), literal('triple'));
      metadata.addQuad('random', 'new', 'triple');
      expect(metadata.quads()).toBeRdfIsomorphic([ ...inputQuads, newQuad ]);
    });

    it('can add a quad with a graph.', async(): Promise<void> => {
      const newQuad = quad(namedNode('random'), namedNode('new'), literal('triple'), namedNode('graph'));
      metadata.addQuad('random', 'new', 'triple', 'graph');
      expect(metadata.quads()).toBeRdfIsomorphic([ ...inputQuads, newQuad ]);
    });

    it('can add quads.', async(): Promise<void> => {
      const newQuads: Quad[] = [
        quad(namedNode('random'), namedNode('new'), namedNode('triple')),
      ];
      metadata.addQuads(newQuads);
      expect(metadata.quads()).toBeRdfIsomorphic([ ...newQuads, ...inputQuads ]);
    });

    it('can remove a quad.', async(): Promise<void> => {
      const old = inputQuads[0];
      metadata.removeQuad(old.subject as any, old.predicate as any, old.object as any, old.graph as any);
      expect(metadata.quads()).toBeRdfIsomorphic(inputQuads.slice(1));
    });

    it('removes all matching triples if graph is undefined.', async(): Promise<void> => {
      metadata.removeQuad(identifier, 'has', 'data');
      expect(metadata.quads()).toHaveLength(inputQuads.length - 2);
      expect(metadata.quads()).toBeRdfIsomorphic(removeQuads(inputQuads, identifier.value, 'has', 'data'));
    });

    it('can remove quads.', async(): Promise<void> => {
      metadata.removeQuads([ inputQuads[0] ]);
      expect(metadata.quads()).toBeRdfIsomorphic(inputQuads.slice(1));
    });

    it('can add a single value for a predicate.', async(): Promise<void> => {
      const newQuad = quad(identifier, namedNode('new'), namedNode('triple'));
      metadata.add(newQuad.predicate as NamedNode, newQuad.object as NamedNode);
      expect(metadata.quads()).toBeRdfIsomorphic([ newQuad, ...inputQuads ]);
    });

    it('can add single values as string.', async(): Promise<void> => {
      const newQuad = quad(identifier, namedNode('new'), literal('triple'));
      metadata.add(newQuad.predicate as NamedNode, newQuad.object.value);
      expect(metadata.quads()).toBeRdfIsomorphic([ newQuad, ...inputQuads ]);
    });

    it('can add multiple values for a predicate.', async(): Promise<void> => {
      const newQuads = [
        quad(identifier, namedNode('new'), namedNode('triple')),
        quad(identifier, namedNode('new'), namedNode('triple2')),
      ];
      metadata.add(namedNode('new'), [ namedNode('triple'), namedNode('triple2') ]);
      expect(metadata.quads()).toBeRdfIsomorphic([ ...newQuads, ...inputQuads ]);
    });

    it('can remove a single value for a predicate.', async(): Promise<void> => {
      metadata.remove(namedNode('has'), literal('data'));
      expect(metadata.quads()).toBeRdfIsomorphic(removeQuads(inputQuads, identifier.value, 'has', 'data'));
    });

    it('can remove single values as string.', async(): Promise<void> => {
      metadata.remove(namedNode('has'), 'data');
      expect(metadata.quads()).toBeRdfIsomorphic(removeQuads(inputQuads, identifier.value, 'has', 'data'));
    });

    it('can remove multiple values for a predicate.', async(): Promise<void> => {
      metadata.remove(namedNode('has'), [ literal('data'), 'moreData' ]);
      let expected = removeQuads(inputQuads, identifier.value, 'has', 'data');
      expected = removeQuads(expected, identifier.value, 'has', 'moreData');
      expect(metadata.quads()).toBeRdfIsomorphic(expected);
    });

    it('can remove all values for a predicate.', async(): Promise<void> => {
      const pred = namedNode('has');
      metadata.removeAll(pred);
      expect(metadata.quads()).toBeRdfIsomorphic(removeQuads(inputQuads, identifier.value, 'has'));
    });

    it('can remove all values for a predicate in a specific graph.', async(): Promise<void> => {
      const pred = namedNode('has');
      metadata.removeAll(pred, graphNode);
      expect(metadata.quads()).toBeRdfIsomorphic(
        removeQuads(inputQuads, identifier.value, 'has', undefined, graphNode.value),
      );
    });

    it('can get all values for a predicate.', async(): Promise<void> => {
      expect(metadata.getAll(namedNode('has'))).toEqualRdfTermArray(
        [ literal('data'), literal('moreData'), literal('data') ],
      );
    });

    it('can get all values for a predicate in a graph.', async(): Promise<void> => {
      expect(metadata.getAll(namedNode('has'), defaultGraph())).toEqualRdfTermArray(
        [ literal('data'), literal('moreData') ],
      );
    });

    it('can get the single value for a predicate.', async(): Promise<void> => {
      expect(metadata.get(namedNode('hasOne'))).toEqualRdfTerm(literal('otherData'));
    });

    it('returns undefined if getting an undefined predicate.', async(): Promise<void> => {
      expect(metadata.get(namedNode('doesntExist'))).toBeUndefined();
    });

    it('errors if there are multiple values when getting a value.', async(): Promise<void> => {
      expect((): any => metadata.get(namedNode('has'))).toThrow(Error);
      expect((): any => metadata.get('has')).toThrow(Error);
    });

    it('can set the value of a predicate.', async(): Promise<void> => {
      metadata.set(namedNode('has'), literal('singleValue'));
      expect(metadata.get(namedNode('has'))).toEqualRdfTerm(literal('singleValue'));
    });

    it('can set multiple values of a predicate.', async(): Promise<void> => {
      metadata.set(namedNode('has'), [ literal('value1'), literal('value2') ]);
      expect(metadata.getAll(namedNode('has'))).toEqualRdfTermArray([ literal('value1'), literal('value2') ]);
    });

    it('has a shorthand for content-type.', async(): Promise<void> => {
      expect(metadata.contentType).toBeUndefined();
      metadata.contentType = 'a/b';
      expect(metadata.get(CONTENT_TYPE)).toEqualRdfTerm(literal('a/b'));
      expect(metadata.contentType).toBe('a/b');
      metadata.contentType = undefined;
      expect(metadata.contentType).toBeUndefined();
    });

    it('errors if a shorthand has multiple values.', async(): Promise<void> => {
      metadata.add(CONTENT_TYPE, 'a/b');
      metadata.add(CONTENT_TYPE, 'c/d');
      expect((): any => metadata.contentType).toThrow();
    });

    it('has a shorthand for Content-Type as string.', async(): Promise<void> => {
      expect(metadata.contentType).toBeUndefined();
      expect(metadata.contentTypeObject).toBeUndefined();
      metadata.contentType = 'text/plain; charset=utf-8; test=value1';
      expect(metadata.contentTypeObject).toEqual({
        value: 'text/plain',
        parameters: {
          charset: 'utf-8',
          test: 'value1',
        },
      });
    });

    it('has a shorthand for Content-Type as object.', async(): Promise<void> => {
      expect(metadata.contentType).toBeUndefined();
      expect(metadata.contentTypeObject).toBeUndefined();
      metadata.contentTypeObject = {
        value: 'text/plain',
        parameters: {
          charset: 'utf-8',
          test: 'value1',
        },
      };
      expect(metadata.contentTypeObject).toEqual({
        value: 'text/plain',
        parameters: {
          charset: 'utf-8',
          test: 'value1',
        },
      });
      expect(metadata.contentType).toBe('text/plain');
    });

    it('can properly clear the Content-Type parameters explicitly.', async(): Promise<void> => {
      expect(metadata.contentType).toBeUndefined();
      expect(metadata.contentTypeObject).toBeUndefined();
      metadata.contentType = 'text/plain; charset=utf-8; test=value1';
      metadata.contentType = undefined;
      expect(metadata.contentType).toBeUndefined();
      expect(metadata.contentTypeObject).toBeUndefined();
      expect(metadata.quads(null, SOLID_META.terms.contentTypeParameter, null, null)).toHaveLength(0);
      expect(metadata.quads(null, SOLID_META.terms.value, null, null)).toHaveLength(0);
      expect(metadata.quads(null, RDFS.terms.label, null, null)).toHaveLength(0);
    });

    it('can properly clear the Content-Type parameters implicitly.', async(): Promise<void> => {
      expect(metadata.contentType).toBeUndefined();
      expect(metadata.contentTypeObject).toBeUndefined();
      metadata.contentType = 'text/plain; charset=utf-8; test=value1';
      metadata.contentType = 'text/turtle';
      expect(metadata.contentType).toBe('text/turtle');
      expect(metadata.contentTypeObject).toEqual({
        value: 'text/turtle',
        parameters: {},
      });
      expect(metadata.quads(null, SOLID_META.terms.contentTypeParameter, null, null)).toHaveLength(0);
      expect(metadata.quads(null, SOLID_META.terms.value, null, null)).toHaveLength(0);
      expect(metadata.quads(null, RDFS.terms.label, null, null)).toHaveLength(0);
    });

    it('can return invalid parameters when too many quads are present.', async(): Promise<void> => {
      expect(metadata.contentType).toBeUndefined();
      expect(metadata.contentTypeObject).toBeUndefined();
      metadata.contentType = 'text/plain; charset=utf-8; test=value1';
      const param = metadata.quads(null, SOLID_META.terms.value)[0].subject;
      metadata.addQuad(param as BlankNode, SOLID_META.terms.value, 'anomaly');
      expect(metadata.contentTypeObject?.parameters).toMatchObject({ invalid: '' });
    });
  });
});
