import { DataFactory } from 'n3';
import { createVocabulary, extendVocabulary } from '../../../src/util/Vocabularies';

describe('Vocabularies', (): void => {
  const vocabulary = createVocabulary('http://www.w3.org/ns/ldp#', 'contains', 'Container');

  describe('createVocabulary', (): void => {
    it('contains its own URI.', (): void => {
      expect(vocabulary.namespace).toBe('http://www.w3.org/ns/ldp#');
    });

    it('contains its own URI as a term.', (): void => {
      expect(vocabulary.terms.namespace).toEqual(DataFactory.namedNode('http://www.w3.org/ns/ldp#'));
    });

    it('exposes the defined URIs.', (): void => {
      expect(vocabulary.contains).toBe('http://www.w3.org/ns/ldp#contains');
      expect(vocabulary.Container).toBe('http://www.w3.org/ns/ldp#Container');
    });

    it('exposes the defined URIs as terms.', (): void => {
      expect(vocabulary.terms.contains).toEqual(DataFactory.namedNode('http://www.w3.org/ns/ldp#contains'));
      expect(vocabulary.terms.Container).toEqual(DataFactory.namedNode('http://www.w3.org/ns/ldp#Container'));
    });
  });

  describe('extendVocabulary', (): void => {
    const extended = extendVocabulary(vocabulary, 'extended', 'extra');

    it('still contains all the original values.', async(): Promise<void> => {
      expect(extended.namespace).toBe('http://www.w3.org/ns/ldp#');
      expect(extended.terms.namespace).toEqual(DataFactory.namedNode('http://www.w3.org/ns/ldp#'));
      expect(extended.contains).toBe('http://www.w3.org/ns/ldp#contains');
      expect(extended.Container).toBe('http://www.w3.org/ns/ldp#Container');
      expect(extended.terms.contains).toEqual(DataFactory.namedNode('http://www.w3.org/ns/ldp#contains'));
      expect(extended.terms.Container).toEqual(DataFactory.namedNode('http://www.w3.org/ns/ldp#Container'));
    });

    it('contains the new values.', async(): Promise<void> => {
      expect(extended.extended).toBe('http://www.w3.org/ns/ldp#extended');
      expect(extended.extra).toBe('http://www.w3.org/ns/ldp#extra');
      expect(extended.terms.extended).toEqual(DataFactory.namedNode('http://www.w3.org/ns/ldp#extended'));
      expect(extended.terms.extra).toEqual(DataFactory.namedNode('http://www.w3.org/ns/ldp#extra'));
    });

    it('does not modify the original vocabulary.', async(): Promise<void> => {
      expect((vocabulary as any).extended).toBeUndefined();
    });
  });
});
