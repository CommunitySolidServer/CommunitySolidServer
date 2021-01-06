import { namedNode } from '@rdfjs/data-model';
import { LDP } from '../../../src/util/Vocabularies';

describe('Vocabularies', (): void => {
  describe('LDP', (): void => {
    it('contains its own URI.', (): void => {
      expect(LDP.namespace).toBe('http://www.w3.org/ns/ldp#');
    });

    it('contains its own URI as a term.', (): void => {
      expect(LDP.terms.namespace).toEqual(namedNode('http://www.w3.org/ns/ldp#'));
    });

    it('exposes ldp:contains.', (): void => {
      expect(LDP.contains).toBe('http://www.w3.org/ns/ldp#contains');
    });

    it('exposes ldp:contains as a term.', (): void => {
      expect(LDP.terms.contains).toEqual(namedNode('http://www.w3.org/ns/ldp#contains'));
    });
  });
});
