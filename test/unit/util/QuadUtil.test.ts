import 'jest-rdf';
import { DataFactory as DF, Store } from 'n3';
import { parseQuads, serializeQuads, solveBgp, termToInt, uniqueQuads } from '../../../src/util/QuadUtil';
import { guardedStreamFrom, readableToString } from '../../../src/util/StreamUtil';

describe('QuadUtil', (): void => {
  describe('#serializeQuads', (): void => {
    it('converts quads to the requested format.', async(): Promise<void> => {
      const quads = [ DF.quad(
        DF.namedNode('pre:sub'),
        DF.namedNode('pre:pred'),
        DF.literal('obj'),
      ) ];
      const stream = serializeQuads(quads, 'application/n-triples');
      await expect(readableToString(stream)).resolves.toMatch('<pre:sub> <pre:pred> "obj" .');
    });
  });

  describe('#parseQuads', (): void => {
    it('parses quads.', async(): Promise<void> => {
      const stream = guardedStreamFrom([ '<pre:sub> <pre:pred> "obj".' ]);
      await expect(parseQuads(stream)).resolves.toEqualRdfQuadArray([ DF.quad(
        DF.namedNode('pre:sub'),
        DF.namedNode('pre:pred'),
        DF.literal('obj'),
      ) ]);
    });

    it('parses quads with the given options.', async(): Promise<void> => {
      const stream = guardedStreamFrom([ '<> <pre:pred> "obj".' ]);
      await expect(parseQuads(stream, { baseIRI: 'pre:sub' })).resolves.toEqualRdfQuadArray([ DF.quad(
        DF.namedNode('pre:sub'),
        DF.namedNode('pre:pred'),
        DF.literal('obj'),
      ) ]);
    });
  });

  describe('#uniqueQuads', (): void => {
    it('filters out duplicate quads.', async(): Promise<void> => {
      const quads = [
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
        DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
      ];
      expect(uniqueQuads(quads)).toBeRdfIsomorphic([
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
        DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
      ]);
    });
  });

  describe('#termToInt', (): void => {
    it('returns undefined if the input is undefined.', async(): Promise<void> => {
      expect(termToInt()).toBeUndefined();
    });

    it('converts the term to a number.', async(): Promise<void> => {
      expect(termToInt(DF.namedNode('5'))).toBe(5);
      expect(termToInt(DF.namedNode('0xF'), 16)).toBe(15);
    });
  });

  describe('#solveBgp', (): void => {
    it('finds all matching bindings.', async(): Promise<void> => {
      const bgp = [
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.variable('v1')),
        DF.quad(DF.variable('v1'), DF.namedNode('ex:p2'), DF.variable('v2')),
        DF.quad(DF.variable('v1'), DF.variable('v3'), DF.variable('v2')),
      ];
      const data = new Store([
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
        DF.quad(DF.namedNode('ex:o1'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o2')),
        DF.quad(DF.namedNode('ex:o2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o3')),
        DF.quad(DF.namedNode('ex:o4'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
      ]);
      const bindings = solveBgp(bgp, data);
      expect(bindings).toHaveLength(2);
      expect(bindings[0]).toEqual({
        v1: DF.namedNode('ex:o1'),
        v2: DF.namedNode('ex:o2'),
        v3: DF.namedNode('ex:p2'),
      });
      expect(bindings[1]).toEqual({
        v1: DF.namedNode('ex:o2'),
        v2: DF.namedNode('ex:o2'),
        v3: DF.namedNode('ex:p2'),
      });
    });
  });
});
