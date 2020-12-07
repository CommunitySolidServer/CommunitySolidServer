import 'jest-rdf';
import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import { pushQuad } from '../../../src/util/QuadUtil';

describe('QuadUtil', (): void => {
  describe('#pushQuad', (): void => {
    it('creates a quad and adds it to the given array.', async(): Promise<void> => {
      const quads: Quad[] = [];
      pushQuad(quads, DataFactory.namedNode('sub'), DataFactory.namedNode('pred'), DataFactory.literal('obj'));
      expect(quads).toEqualRdfQuadArray([
        DataFactory.quad(DataFactory.namedNode('sub'), DataFactory.namedNode('pred'), DataFactory.literal('obj')),
      ]);
    });
  });
});
