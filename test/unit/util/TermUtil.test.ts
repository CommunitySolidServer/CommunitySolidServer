import 'jest-rdf';
import { DataFactory } from 'n3';
import {
  isTerm,
  toLiteral,
  toNamedTerm,
  toObjectTerm,
  toPredicateTerm,
} from '../../../src/util/TermUtil';
import { XSD } from '../../../src/util/Vocabularies';

const { literal, namedNode } = DataFactory;

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

  describe('toSubjectTerm function', (): void => {
    it('returns the input if it was a term.', async(): Promise<void> => {
      const nn = namedNode('name');
      expect(toNamedTerm(nn)).toBe(nn);
    });

    it('returns a named node when a string is used.', async(): Promise<void> => {
      expect(toNamedTerm('nn')).toEqualRdfTerm(namedNode('nn'));
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
