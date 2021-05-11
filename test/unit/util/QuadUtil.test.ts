import 'jest-rdf';
import { literal, namedNode, quad } from '@rdfjs/data-model';
import { parseQuads, serializeQuads } from '../../../src/util/QuadUtil';
import { guardedStreamFrom, readableToString } from '../../../src/util/StreamUtil';

describe('QuadUtil', (): void => {
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
    it('parses quads.', async(): Promise<void> => {
      const stream = guardedStreamFrom([ '<pre:sub> <pre:pred> "obj".' ]);
      await expect(parseQuads(stream)).resolves.toEqualRdfQuadArray([ quad(
        namedNode('pre:sub'),
        namedNode('pre:pred'),
        literal('obj'),
      ) ]);
    });

    it('parses quads with the given options.', async(): Promise<void> => {
      const stream = guardedStreamFrom([ '<> <pre:pred> "obj".' ]);
      await expect(parseQuads(stream, { baseIRI: 'pre:sub' })).resolves.toEqualRdfQuadArray([ quad(
        namedNode('pre:sub'),
        namedNode('pre:pred'),
        literal('obj'),
      ) ]);
    });
  });
});
