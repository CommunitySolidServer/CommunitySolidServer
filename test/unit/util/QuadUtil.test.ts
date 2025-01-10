import 'jest-rdf';
import { DataFactory, Store } from 'n3';
import { parseQuads, serializeQuads, solveBgp, termToInt, uniqueQuads } from '../../../src/util/QuadUtil';
import { guardedStreamFrom, readableToString } from '../../../src/util/StreamUtil';
import variable = DataFactory.variable;

const { literal, namedNode, quad } = DataFactory;

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

  describe('#uniqueQuads', (): void => {
    it('filters out duplicate quads.', async(): Promise<void> => {
      const quads = [
        quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')),
        quad(namedNode('ex:s2'), namedNode('ex:p2'), namedNode('ex:o2')),
        quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')),
      ];
      expect(uniqueQuads(quads)).toBeRdfIsomorphic([
        quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')),
        quad(namedNode('ex:s2'), namedNode('ex:p2'), namedNode('ex:o2')),
      ]);
    });
  });

  describe('#termToInt', (): void => {
    it('returns undefined if the input is undefined.', async(): Promise<void> => {
      expect(termToInt()).toBeUndefined();
    });

    it('converts the term to a number.', async(): Promise<void> => {
      expect(termToInt(namedNode('5'))).toBe(5);
      expect(termToInt(namedNode('0xF'), 16)).toBe(15);
    });
  });

  describe('#solveBgp', (): void => {
    it('finds all matching bindings.', async(): Promise<void> => {
      const bgp = [
        quad(namedNode('ex:s1'), namedNode('ex:p1'), variable('v1')),
        quad(variable('v1'), namedNode('ex:p2'), variable('v2')),
        quad(variable('v1'), variable('v3'), variable('v2')),
      ];
      const data = new Store([
        quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')),
        quad(namedNode('ex:o1'), namedNode('ex:p2'), namedNode('ex:o2')),
        quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o2')),
        quad(namedNode('ex:o2'), namedNode('ex:p2'), namedNode('ex:o2')),
        quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o3')),
        quad(namedNode('ex:o4'), namedNode('ex:p2'), namedNode('ex:o2')),
      ]);
      const bindings = solveBgp(bgp, data);
      expect(bindings).toHaveLength(2);
      expect(bindings[0]).toEqual({
        v1: namedNode('ex:o1'),
        v2: namedNode('ex:o2'),
        v3: namedNode('ex:p2'),
      });
      expect(bindings[1]).toEqual({
        v1: namedNode('ex:o2'),
        v2: namedNode('ex:o2'),
        v3: namedNode('ex:p2'),
      });
    });
  });
});
