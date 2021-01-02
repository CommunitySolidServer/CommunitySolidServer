import { LDP } from '../../../src/util/Vocabularies';

describe('Vocabularies', (): void => {
  describe('LDP', (): void => {
    it('can create new properties.', (): void => {
      expect(LDP('new')).toBe('http://www.w3.org/ns/ldp#new');
    });

    it('caches new properties.', (): void => {
      expect(LDP('new')).toBe(LDP('new'));
    });

    it('exposes ldp:contains.', (): void => {
      expect(LDP.contains).toBe('http://www.w3.org/ns/ldp#contains');
    });
  });
});
