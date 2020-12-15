import 'jest-rdf';
import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import { parseQuads, pushQuad, serializeQuads } from '../../../src/util/QuadUtil';
import { guardedStreamFrom, readableToString } from '../../../src/util/StreamUtil';

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

  describe('#serializeQuads', (): void => {
    it('converts quads to the requested format.', async(): Promise<void> => {
      const quads = [ DataFactory.quad(
        DataFactory.namedNode('pre:sub'),
        DataFactory.namedNode('pre:pred'),
        DataFactory.literal('obj'),
      ) ];
      const stream = serializeQuads(quads, 'application/n-triples');
      await expect(readableToString(stream)).resolves.toMatch('<pre:sub> <pre:pred> "obj" .');
    });
  });

  describe('#parseQuads', (): void => {
    it('parses quads from the requested format.', async(): Promise<void> => {
      const stream = guardedStreamFrom([ '<pre:sub> <pre:pred> "obj".' ]);
      await expect(parseQuads(stream, 'application/n-triples')).resolves.toEqualRdfQuadArray([ DataFactory.quad(
        DataFactory.namedNode('pre:sub'),
        DataFactory.namedNode('pre:pred'),
        DataFactory.literal('obj'),
      ) ]);
    });
  });
});
