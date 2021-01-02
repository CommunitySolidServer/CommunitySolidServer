import 'jest-rdf';
import { literal, namedNode, quad } from '@rdfjs/data-model';
import type { Quad } from 'rdf-js';
import { parseQuads, pushQuad, serializeQuads } from '../../../src/util/QuadUtil';
import { guardedStreamFrom, readableToString } from '../../../src/util/StreamUtil';

describe('QuadUtil', (): void => {
  describe('#pushQuad', (): void => {
    it('creates a quad and adds it to the given array.', async(): Promise<void> => {
      const quads: Quad[] = [];
      pushQuad(quads, namedNode('sub'), namedNode('pred'), literal('obj'));
      expect(quads).toEqualRdfQuadArray([
        quad(namedNode('sub'), namedNode('pred'), literal('obj')),
      ]);
    });

    it('creates a quad from strings and adds it to the given array.', async(): Promise<void> => {
      const quads: Quad[] = [];
      pushQuad(quads, 'sub', 'pred', 'obj');
      expect(quads).toEqualRdfQuadArray([
        quad(namedNode('sub'), namedNode('pred'), namedNode('obj')),
      ]);
    });
  });

  describe('#serializeQuads', (): void => {
    it('converts quads to the requested format.', async(): Promise<void> => {
      const quads = [ quad(
        namedNode('pre:sub'),
        namedNode('pre:pred'),
        literal('obj'),
      ) ];
      const stream = serializeQuads(quads, 'application/n-triples');
      await expect(readableToString(stream)).resolves.toMatch('<pre:sub> <pre:pred> "obj" .');
    });
  });

  describe('#parseQuads', (): void => {
    it('parses quads from the requested format.', async(): Promise<void> => {
      const stream = guardedStreamFrom([ '<pre:sub> <pre:pred> "obj".' ]);
      await expect(parseQuads(stream, 'application/n-triples')).resolves.toEqualRdfQuadArray([ quad(
        namedNode('pre:sub'),
        namedNode('pre:pred'),
        literal('obj'),
      ) ]);
    });
  });
});
