import 'jest-rdf';
import { namedNode, quad } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import type { Quad } from 'rdf-js';
import { translate } from 'sparqlalgebrajs';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { SparqlUpdatePatch } from '../../../../src/http/representation/SparqlUpdatePatch';
import type { RepresentationPatcherInput } from '../../../../src/storage/patch/RepresentationPatcher';
import { SparqlUpdatePatcher } from '../../../../src/storage/patch/SparqlUpdatePatcher';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

function getPatch(query: string): SparqlUpdatePatch {
  const prefixedQuery = `prefix : <http://test.com/>\n${query}`;
  return {
    algebra: translate(prefixedQuery, { quads: true }),
    data: guardedStreamFrom(prefixedQuery),
    metadata: new RepresentationMetadata(),
    binary: true,
  };
}

describe('A SparqlUpdatePatcher', (): void => {
  let patcher: SparqlUpdatePatcher;
  let startQuads: Quad[];
  let representation: Representation;
  const identifier = { path: 'http://test.com/foo' };
  const fulfilledDataInsert = 'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 . }';

  beforeEach(async(): Promise<void> => {
    startQuads = [ quad(
      namedNode('http://test.com/startS1'),
      namedNode('http://test.com/startP1'),
      namedNode('http://test.com/startO1'),
    ), quad(
      namedNode('http://test.com/startS2'),
      namedNode('http://test.com/startP2'),
      namedNode('http://test.com/startO2'),
    ) ];

    representation = new BasicRepresentation(startQuads, 'internal/quads');

    patcher = new SparqlUpdatePatcher();
  });

  it('only accepts SPARQL updates.', async(): Promise<void> => {
    const input = { identifier, patch: { algebra: {}} as SparqlUpdatePatch };
    await expect(patcher.canHandle(input)).resolves.toBeUndefined();
    delete (input.patch as any).algebra;
    await expect(patcher.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('handles NOP operations by not doing anything.', async(): Promise<void> => {
    let patch = getPatch('');
    let input: RepresentationPatcherInput = { identifier, patch, representation };
    await expect(patcher.handle(input)).resolves.toBe(representation);

    patch = getPatch('');
    input = { identifier, patch };
    const result = await patcher.handle(input);
    expect(result.metadata.contentType).toBe('internal/quads');
    await expect(arrayifyStream(result.data)).resolves.toEqual([]);
  });

  it('handles INSERT DATA updates.', async(): Promise<void> => {
    const patch = getPatch(fulfilledDataInsert);
    const input: RepresentationPatcherInput = { identifier, patch, representation };
    const result = await patcher.handle(input);
    expect(result.metadata.contentType).toBe('internal/quads');
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      ...startQuads,
      quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
      quad(namedNode('http://test.com/s2'), namedNode('http://test.com/p2'), namedNode('http://test.com/o2')),
    ]);
  });

  it('handles DELETE DATA updates.', async(): Promise<void> => {
    const patch = getPatch('DELETE DATA { :startS1 :startP1 :startO1 }');
    const input: RepresentationPatcherInput = { identifier, patch, representation };
    const result = await patcher.handle(input);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
    ]);
  });

  it('handles DELETE WHERE updates with no variables.', async(): Promise<void> => {
    const patch = getPatch('DELETE WHERE { :startS1 :startP1 :startO1 }');
    const input: RepresentationPatcherInput = { identifier, patch, representation };
    const result = await patcher.handle(input);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
    ]);
  });

  it('handles DELETE WHERE updates with variables.', async(): Promise<void> => {
    const patch = getPatch('DELETE WHERE { :startS1 :startP1 ?o }');
    const input: RepresentationPatcherInput = { identifier, patch, representation };
    const result = await patcher.handle(input);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
    ]);
  });

  it('handles DELETE/INSERT updates with empty WHERE.', async(): Promise<void> => {
    const patch = getPatch('DELETE { :startS1 :startP1 :startO1 } INSERT { :s1 :p1 :o1 . } WHERE {}');
    const input: RepresentationPatcherInput = { identifier, patch, representation };
    const result = await patcher.handle(input);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
      quad(namedNode('http://test.com/s1'),
        namedNode('http://test.com/p1'),
        namedNode('http://test.com/o1')),
    ]);
  });

  it('handles composite INSERT/DELETE updates.', async(): Promise<void> => {
    const query = 'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 };' +
      'DELETE WHERE { :s1 :p1 :o1 . :startS1 :startP1 :startO1 }';
    const patch = getPatch(query);
    const input: RepresentationPatcherInput = { identifier, patch, representation };
    const result = await patcher.handle(input);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
      quad(namedNode('http://test.com/s2'),
        namedNode('http://test.com/p2'),
        namedNode('http://test.com/o2')),
    ]);
  });

  it('handles composite DELETE/INSERT updates.', async(): Promise<void> => {
    const query = 'DELETE DATA { :s1 :p1 :o1 . :startS1 :startP1 :startO1 } ;' +
      'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 }';
    const patch = getPatch(query);
    const input: RepresentationPatcherInput = { identifier, patch, representation };
    const result = await patcher.handle(input);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
      quad(namedNode('http://test.com/s1'),
        namedNode('http://test.com/p1'),
        namedNode('http://test.com/o1')),
      quad(namedNode('http://test.com/s2'),
        namedNode('http://test.com/p2'),
        namedNode('http://test.com/o2')),
    ]);
  });

  it('rejects GRAPH inserts.', async(): Promise<void> => {
    const query = 'INSERT DATA { GRAPH :graph { :s1 :p1 :o1 } }';
    const patch = getPatch(query);
    const input: RepresentationPatcherInput = { identifier, patch, representation };

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects GRAPH deletes.', async(): Promise<void> => {
    const query = 'DELETE DATA { GRAPH :graph { :s1 :p1 :o1 } }';
    const patch = getPatch(query);
    const input: RepresentationPatcherInput = { identifier, patch, representation };

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects DELETE/INSERT updates with non-BGP WHERE.', async(): Promise<void> => {
    const query = 'DELETE { :s1 :p1 :o1 } INSERT { :s1 :p1 :o1 } WHERE { ?s ?p ?o. FILTER (?o > 5) }';
    const patch = getPatch(query);
    const input: RepresentationPatcherInput = { identifier, patch, representation };

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects INSERT WHERE updates with a UNION.', async(): Promise<void> => {
    const query = 'INSERT { :s1 :p1 :o1 . } WHERE { { :s1 :p1 :o1 } UNION { :s1 :p1 :o2 } }';
    const patch = getPatch(query);
    const input: RepresentationPatcherInput = { identifier, patch, representation };

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects non-DELETE/INSERT updates.', async(): Promise<void> => {
    const query = 'MOVE DEFAULT TO GRAPH :newGraph';
    const patch = getPatch(query);
    const input: RepresentationPatcherInput = { identifier, patch, representation };

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('creates a new resource if it does not exist yet.', async(): Promise<void> => {
    const query = 'INSERT DATA { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1>. }';
    const patch = getPatch(query);
    const input: RepresentationPatcherInput = { identifier, patch };
    const result = await patcher.handle(input);
    expect(result.metadata.contentType).toBe('internal/quads');
    expect(result.metadata.identifier.value).toBe(identifier.path);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
    ]);
  });

  it('requires the input body to contain quads.', async(): Promise<void> => {
    const query = 'INSERT DATA { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1>. }';
    const patch = getPatch(query);
    representation.metadata.contentType = 'text/turtle';
    const input = { identifier, patch, representation };
    await expect(patcher.handle(input)).rejects.toThrow('Quad stream was expected for patching.');
  });
});
