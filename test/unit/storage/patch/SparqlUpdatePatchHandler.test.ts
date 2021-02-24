import 'jest-rdf';
import { namedNode, quad } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import type { Quad } from 'rdf-js';
import { translate } from 'sparqlalgebrajs';
import type { SparqlUpdatePatch } from '../../../../src/ldp/http/SparqlUpdatePatch';
import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { SparqlUpdatePatchHandler } from '../../../../src/storage/patch/SparqlUpdatePatchHandler';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A SparqlUpdatePatchHandler', (): void => {
  let handler: SparqlUpdatePatchHandler;
  let source: ResourceStore;
  let startQuads: Quad[];
  const fullfilledDataInsert = 'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 . }';

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

    source = {
      getRepresentation: jest.fn(async(): Promise<any> => new BasicRepresentation(startQuads, 'internal/quads', false)),
      setRepresentation: jest.fn(),
      modifyResource: jest.fn(async(): Promise<any> => {
        throw new Error('noModify');
      }),
    } as unknown as ResourceStore;

    handler = new SparqlUpdatePatchHandler(source);
  });

  async function basicChecks(quads: Quad[]): Promise<boolean> {
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(
      { path: 'path' }, { type: { [INTERNAL_QUADS]: 1 }},
    );
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    const setParams = (source.setRepresentation as jest.Mock).mock.calls[0];
    expect(setParams[0]).toEqual({ path: 'path' });
    expect(setParams[1]).toEqual(expect.objectContaining({
      binary: false,
      metadata: expect.any(RepresentationMetadata),
    }));
    expect(setParams[1].metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(setParams[1].data)).resolves.toBeRdfIsomorphic(quads);
    return true;
  }

  async function handle(query: string): Promise<void> {
    const sparqlPrefix = 'prefix : <http://test.com/>\n';
    await handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(sparqlPrefix.concat(query), { quads: true }) } as SparqlUpdatePatch });
  }

  it('only accepts SPARQL updates.', async(): Promise<void> => {
    const input = { identifier: { path: 'path' },
      patch: { algebra: {}} as SparqlUpdatePatch };
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    delete (input.patch as any).algebra;
    await expect(handler.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('handles INSERT DATA updates.', async(): Promise<void> => {
    await handle(fullfilledDataInsert);
    expect(await basicChecks(startQuads.concat(
      [ quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
        quad(namedNode('http://test.com/s2'), namedNode('http://test.com/p2'), namedNode('http://test.com/o2')) ],
    ))).toBe(true);
  });

  it('handles DELETE DATA updates.', async(): Promise<void> => {
    await handle('DELETE DATA { :startS1 :startP1 :startO1 }');
    expect(await basicChecks(
      [ quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')) ],
    )).toBe(true);
  });

  it('handles DELETE WHERE updates with no variables.', async(): Promise<void> => {
    const query = 'DELETE WHERE { :startS1 :startP1 :startO1 }';
    await handle(query);
    expect(await basicChecks(
      [ quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')) ],
    )).toBe(true);
  });

  it('handles DELETE/INSERT updates with empty WHERE.', async(): Promise<void> => {
    const query = 'DELETE { :startS1 :startP1 :startO1 } INSERT { :s1 :p1 :o1 . } WHERE {}';
    await handle(query);
    expect(await basicChecks([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
      quad(namedNode('http://test.com/s1'),
        namedNode('http://test.com/p1'),
        namedNode('http://test.com/o1')),
    ])).toBe(true);
  });

  it('handles composite INSERT/DELETE updates.', async(): Promise<void> => {
    const query = 'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 };' +
      'DELETE WHERE { :s1 :p1 :o1 . :startS1 :startP1 :startO1 }';
    await handle(query);
    expect(await basicChecks([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
      quad(namedNode('http://test.com/s2'),
        namedNode('http://test.com/p2'),
        namedNode('http://test.com/o2')),
    ])).toBe(true);
  });

  it('handles composite DELETE/INSERT updates.', async(): Promise<void> => {
    const query = 'DELETE DATA { :s1 :p1 :o1 . :startS1 :startP1 :startO1 } ;' +
      'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 }';
    await handle(query);
    expect(await basicChecks([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
      quad(namedNode('http://test.com/s1'),
        namedNode('http://test.com/p1'),
        namedNode('http://test.com/o1')),
      quad(namedNode('http://test.com/s2'),
        namedNode('http://test.com/p2'),
        namedNode('http://test.com/o2')),
    ])).toBe(true);
  });

  it('rejects GRAPH inserts.', async(): Promise<void> => {
    const query = 'INSERT DATA { GRAPH :graph { :s1 :p1 :o1 } }';
    await expect(handle(query)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects GRAPH deletes.', async(): Promise<void> => {
    const query = 'DELETE DATA { GRAPH :graph { :s1 :p1 :o1 } }';
    await expect(handle(query)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects DELETE/INSERT updates with a non-empty WHERE.', async(): Promise<void> => {
    const query = 'DELETE { :s1 :p1 :o1 } INSERT { :s1 :p1 :o1 } WHERE { ?s ?p ?o }';
    await expect(handle(query)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects INSERT WHERE updates with a UNION.', async(): Promise<void> => {
    const query = 'INSERT { :s1 :p1 :o1 . } WHERE { { :s1 :p1 :o1 } UNION { :s1 :p1 :o2 } }';
    await expect(handle(query)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects DELETE WHERE updates with variables.', async(): Promise<void> => {
    const query = 'DELETE WHERE { ?v :startP1 :startO1 }';
    await expect(handle(query)).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects non-DELETE/INSERT updates.', async(): Promise<void> => {
    const query = 'MOVE DEFAULT TO GRAPH :newGraph';
    await expect(handle(query)).rejects.toThrow(NotImplementedHttpError);
  });

  it('throws the error returned by the store if there is one.', async(): Promise<void> => {
    source.getRepresentation = jest.fn(async(): Promise<any> => {
      throw new Error('error');
    });
    await expect(handle(fullfilledDataInsert)).rejects.toThrow('error');
  });

  it('creates a new resource if it does not exist yet.', async(): Promise<void> => {
    startQuads = [];
    source.getRepresentation = jest.fn((): any => {
      throw new NotFoundHttpError();
    });
    const query = 'INSERT DATA { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1>. }';
    await handle(query);
    expect(await basicChecks(startQuads.concat(
      [ quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')) ],
    ))).toBe(true);
  });
});
