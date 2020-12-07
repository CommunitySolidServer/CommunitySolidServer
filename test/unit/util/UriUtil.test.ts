import 'jest-rdf';
import { literal, namedNode } from '@rdfjs/data-model';
import { CONTENT_TYPE, XSD } from '../../../src/util/UriConstants';
import { toNamedNode, toObjectTerm, toTypedLiteral, isTerm } from '../../../src/util/UriUtil';

describe('An UriUtil', (): void => {
  describe('isTerm function', (): void => {
    it('checks if any input is a Term.', async(): Promise<void> => {
      expect(isTerm(namedNode('name'))).toBeTruthy();
      expect(isTerm(literal('value'))).toBeTruthy();
      expect(isTerm('notATerm')).toBeFalsy();
      expect(isTerm({})).toBeFalsy();
      expect(isTerm()).toBeFalsy();
    });
  });

  describe('getNamedNode function', (): void => {
    it('returns the input if it was a named node.', async(): Promise<void> => {
      const term = namedNode('name');
      expect(toNamedNode(term)).toBe(term);
    });

    it('returns a named node when a string is used.', async(): Promise<void> => {
      expect(toNamedNode('name')).toEqualRdfTerm(namedNode('name'));
    });

    it('caches generated named nodes.', async(): Promise<void> => {
      const result = toNamedNode('name');
      expect(result).toEqualRdfTerm(namedNode('name'));
      expect(toNamedNode('name')).toBe(result);
    });

    it('supports URI shorthands.', async(): Promise<void> => {
      expect(toNamedNode('contentType')).toEqualRdfTerm(namedNode(CONTENT_TYPE));
    });
  });

  describe('getObjectTerm function', (): void => {
    it('returns the input if it was a term.', async(): Promise<void> => {
      const nn = namedNode('name');
      const lit = literal('lit');
      expect(toObjectTerm(nn)).toBe(nn);
      expect(toObjectTerm(lit)).toBe(lit);
    });

    it('returns a literal when a string is used.', async(): Promise<void> => {
      expect(toObjectTerm('lit')).toEqualRdfTerm(literal('lit'));
    });
  });

  describe('getTypedLiteral function', (): void => {
    it('converts the input to a valid literal with the given type.', async(): Promise<void> => {
      const expected = literal('5', namedNode(XSD.integer));
      expect(toTypedLiteral(5, XSD.integer)).toEqualRdfTerm(expected);
    });
  });
});
