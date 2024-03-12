import 'jest-rdf';
import { DataFactory, Store } from 'n3';
import type { Quad } from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { RdfDatasetRepresentation } from '../../../../src/http/representation/RdfDatasetRepresentation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { SparqlUpdatePatch } from '../../../../src/http/representation/SparqlUpdatePatch';
import type { RepresentationPatcherInput } from '../../../../src/storage/patch/RepresentationPatcher';
import { SparqlUpdatePatcher } from '../../../../src/storage/patch/SparqlUpdatePatcher';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

const { namedNode, quad } = DataFactory;

function getPatch(query: string): SparqlUpdatePatch {
  const prefixedQuery = `prefix : <http://test.com/>\n${query}`;
  return {
    algebra: translate(prefixedQuery, { quads: true }) as Algebra.Update,
    data: guardedStreamFrom(prefixedQuery),
    metadata: new RepresentationMetadata(),
    binary: true,
    isEmpty: false,
  };
}

describe('A SparqlUpdatePatcher', (): void => {
  let patcher: SparqlUpdatePatcher;
  let startQuads: Quad[];
  const identifier = { path: 'http://test.com/foo' };
  const fulfilledDataInsert = 'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 . }';
  let store: Store;
  let input: RepresentationPatcherInput<RdfDatasetRepresentation>;
  let representation: RdfDatasetRepresentation;

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
    store = new Store(startQuads);

    representation = new BasicRepresentation() as RdfDatasetRepresentation;
    representation.dataset = store;
    input = { identifier, patch: { algebra: {}} as SparqlUpdatePatch, representation };

    patcher = new SparqlUpdatePatcher();
  });

  it('only accepts SPARQL updates.', async(): Promise<void> => {
    await expect(patcher.canHandle(input)).resolves.toBeUndefined();
    delete (input.patch as any).algebra;
    await expect(patcher.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('handles NOP operations by not doing anything.', async(): Promise<void> => {
    input.patch = getPatch('');
    await expect(patcher.handle(input)).resolves.toBe(representation);

    input.representation = undefined;
    input.patch = getPatch('');
    await expect(patcher.handle(input)).rejects.toThrow(InternalServerError);
  });

  it('handles INSERT DATA updates.', async(): Promise<void> => {
    input.patch = getPatch(fulfilledDataInsert);
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      ...startQuads,
      quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
      quad(namedNode('http://test.com/s2'), namedNode('http://test.com/p2'), namedNode('http://test.com/o2')),
    ]);
  });

  it('handles DELETE DATA updates.', async(): Promise<void> => {
    input.patch = getPatch('DELETE DATA { :startS1 :startP1 :startO1 }');
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(
        namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2'),
      ),
    ]);
  });

  it('handles DELETE WHERE updates with no variables.', async(): Promise<void> => {
    input.patch = getPatch('DELETE WHERE { :startS1 :startP1 :startO1 }');
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(
        namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2'),
      ),
    ]);
  });

  it('handles DELETE WHERE updates with variables.', async(): Promise<void> => {
    input.patch = getPatch('DELETE WHERE { :startS1 :startP1 ?o }');
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(
        namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2'),
      ),
    ]);
  });

  it('handles DELETE/INSERT updates with empty WHERE.', async(): Promise<void> => {
    input.patch = getPatch('DELETE { :startS1 :startP1 :startO1 } INSERT { :s1 :p1 :o1 . } WHERE {}');
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(
        namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2'),
      ),
      quad(
        namedNode('http://test.com/s1'),
        namedNode('http://test.com/p1'),
        namedNode('http://test.com/o1'),
      ),
    ]);
  });

  it('handles composite INSERT/DELETE updates.', async(): Promise<void> => {
    const query = 'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 };' +
      'DELETE WHERE { :s1 :p1 :o1 . :startS1 :startP1 :startO1 }';
    input.patch = getPatch(query);
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(
        namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2'),
      ),
      quad(
        namedNode('http://test.com/s2'),
        namedNode('http://test.com/p2'),
        namedNode('http://test.com/o2'),
      ),
    ]);
  });

  it('handles composite DELETE/INSERT updates.', async(): Promise<void> => {
    const query = 'DELETE DATA { :s1 :p1 :o1 . :startS1 :startP1 :startO1 } ;' +
      'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 }';
    input.patch = getPatch(query);
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(
        namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2'),
      ),
      quad(
        namedNode('http://test.com/s1'),
        namedNode('http://test.com/p1'),
        namedNode('http://test.com/o1'),
      ),
      quad(
        namedNode('http://test.com/s2'),
        namedNode('http://test.com/p2'),
        namedNode('http://test.com/o2'),
      ),
    ]);
  });

  it('rejects GRAPH inserts.', async(): Promise<void> => {
    const query = 'INSERT DATA { GRAPH :graph { :s1 :p1 :o1 } }';
    input.patch = getPatch(query);

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects GRAPH deletes.', async(): Promise<void> => {
    const query = 'DELETE DATA { GRAPH :graph { :s1 :p1 :o1 } }';
    input.patch = getPatch(query);

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects DELETE/INSERT updates with non-BGP WHERE.', async(): Promise<void> => {
    const query = 'DELETE { :s1 :p1 :o1 } INSERT { :s1 :p1 :o1 } WHERE { ?s ?p ?o. FILTER (?o > 5) }';
    input.patch = getPatch(query);

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects INSERT WHERE updates with a UNION.', async(): Promise<void> => {
    const query = 'INSERT { :s1 :p1 :o1 . } WHERE { { :s1 :p1 :o1 } UNION { :s1 :p1 :o2 } }';
    input.patch = getPatch(query);

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects non-DELETE/INSERT updates.', async(): Promise<void> => {
    const query = 'MOVE DEFAULT TO GRAPH :newGraph';
    input.patch = getPatch(query);

    await expect(patcher.handle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('creates a new resource if it does not exist yet.', async(): Promise<void> => {
    const query = 'INSERT DATA { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1>. }';
    input.patch = getPatch(query);
    input.representation!.dataset = new Store();
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
    ]);
  });
});
