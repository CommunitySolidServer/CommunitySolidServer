import 'jest-rdf';
import { literal, namedNode } from '@rdfjs/data-model';
import {
  toCachedNamedNode,
  toSubjectTerm,
  toPredicateTerm,
  toObjectTerm,
  toLiteral,
  isTerm,
} from '../../../src/util/TermUtil';
import { CONTENT_TYPE_TERM, XSD } from '../../../src/util/Vocabularies';

describe('TermUtil', (): void => {
  describe('isTerm function', (): void => {
    it('checks if any input is a Term.', async(): Promise<void> => {
      expect(isTerm(namedNode('name'))).toBeTruthy();
      expect(isTerm(literal('value'))).toBeTruthy();
      expect(isTerm('notATerm')).toBeFalsy();
      expect(isTerm({})).toBeFalsy();
      expect(isTerm()).toBeFalsy();
    });
  });

  describe('toCachedNamedNode function', (): void => {
    it('returns the input if it was a named node.', async(): Promise<void> => {
      const term = namedNode('name');
      expect(toCachedNamedNode(term)).toBe(term);
    });

    it('returns a named node when a string is used.', async(): Promise<void> => {
      expect(toCachedNamedNode('name')).toEqualRdfTerm(namedNode('name'));
    });

    it('caches generated named nodes.', async(): Promise<void> => {
      const result = toCachedNamedNode('name');
      expect(result).toEqualRdfTerm(namedNode('name'));
      expect(toCachedNamedNode('name')).toBe(result);
    });

    it('supports URI shorthands.', async(): Promise<void> => {
      expect(toCachedNamedNode('contentType')).toEqualRdfTerm(CONTENT_TYPE_TERM);
    });
  });

  describe('toSubjectTerm function', (): void => {
    it('returns the input if it was a term.', async(): Promise<void> => {
      const nn = namedNode('name');
      expect(toSubjectTerm(nn)).toBe(nn);
    });

    it('returns a named node when a string is used.', async(): Promise<void> => {
      expect(toSubjectTerm('nn')).toEqualRdfTerm(namedNode('nn'));
    });
  });

  describe('toPredicateTerm function', (): void => {
    it('returns the input if it was a term.', async(): Promise<void> => {
      const nn = namedNode('name');
      expect(toPredicateTerm(nn)).toBe(nn);
    });

    it('returns a named node when a string is used.', async(): Promise<void> => {
      expect(toPredicateTerm('nn')).toEqualRdfTerm(namedNode('nn'));
    });
  });

  describe('toObjectTerm function', (): void => {
    it('returns the input if it was a term.', async(): Promise<void> => {
      const nn = namedNode('name');
      const lit = literal('lit');
      expect(toObjectTerm(nn)).toBe(nn);
      expect(toObjectTerm(lit)).toBe(lit);
    });

    it('returns a named node when a string is used.', async(): Promise<void> => {
      expect(toObjectTerm('nn')).toEqualRdfTerm(namedNode('nn'));
    });

    it('returns a literal when a string is used with preferLiteral.', async(): Promise<void> => {
      expect(toObjectTerm('lit', true)).toEqualRdfTerm(literal('lit'));
    });
  });

  describe('toLiteral function', (): void => {
    it('converts the input to a valid literal with the given type.', async(): Promise<void> => {
      const expected = literal('5', namedNode(XSD.integer));
      expect(toLiteral(5, XSD.terms.integer)).toEqualRdfTerm(expected);
    });
  });
});
