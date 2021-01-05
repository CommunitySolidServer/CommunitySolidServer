import { namedNode } from '@rdfjs/data-model';
import { LDP } from '../../../src/util/Vocabularies';

describe('Vocabularies', (): void => {
  describe('LDP', (): void => {
    it('can return its own URI.', (): void => {
      expect(LDP()).toBe('http://www.w3.org/ns/ldp#');
    });

    it('can create new properties.', (): void => {
      expect(LDP('new')).toBe('http://www.w3.org/ns/ldp#new');
    });

    it('can create new properties as terms.', (): void => {
      expect(LDP.terms('new')).toEqual(namedNode('http://www.w3.org/ns/ldp#new'));
    });

    it('caches new properties as terms.', (): void => {
      expect(LDP.terms('new')).toBe(LDP.terms('new'));
    });

    it('exposes ldp:contains.', (): void => {
      expect(LDP.contains).toBe('http://www.w3.org/ns/ldp#contains');
    });

    it('exposes ldp:contains as a term.', (): void => {
      expect(LDP.terms.contains).toEqual(namedNode('http://www.w3.org/ns/ldp#contains'));
    });

    it('caches ldp:contains as a term.', (): void => {
      expect(LDP.terms.contains).toBe(LDP.terms.contains);
    });
  });
});
