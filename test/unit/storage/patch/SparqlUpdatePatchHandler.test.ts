import { namedNode, quad } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import type { Quad } from 'rdf-js';
import { translate } from 'sparqlalgebrajs';
import streamifyArray from 'streamify-array';
import type { SparqlUpdatePatch } from '../../../../src/ldp/http/SparqlUpdatePatch';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { Lock } from '../../../../src/storage/Lock';
import { SparqlUpdatePatchHandler } from '../../../../src/storage/patch/SparqlUpdatePatchHandler';
import type { ResourceLocker } from '../../../../src/storage/ResourceLocker';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A SparqlUpdatePatchHandler', (): void => {
  let handler: SparqlUpdatePatchHandler;
  let locker: ResourceLocker;
  let lock: Lock;
  let release: () => Promise<void>;
  let source: ResourceStore;
  let startQuads: Quad[];
  let order: string[];

  beforeEach(async(): Promise<void> => {
    order = [];

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
      getRepresentation: jest.fn(async(): Promise<any> => {
        order.push('getRepresentation');
        return {
          dataType: 'quads',
          data: streamifyArray([ ...startQuads ]),
          metadata: null,
        };
      }),
      setRepresentation: jest.fn(async(): Promise<any> => {
        order.push('setRepresentation');
      }),
      modifyResource: jest.fn(async(): Promise<any> => {
        throw new Error('noModify');
      }),
    } as unknown as ResourceStore;

    release = jest.fn(async(): Promise<any> => order.push('release'));
    locker = {
      acquire: jest.fn(async(): Promise<any> => {
        order.push('acquire');
        lock = { release };
        return lock;
      }),
    };

    handler = new SparqlUpdatePatchHandler(source, locker);
  });

  const basicChecks = async(quads: Quad[]): Promise<void> => {
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(
      { path: 'path' }, { type: [{ value: INTERNAL_QUADS, weight: 1 }]},
    );
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'getRepresentation', 'setRepresentation', 'release' ]);
    const setParams = (source.setRepresentation as jest.Mock).mock.calls[0];
    expect(setParams[0]).toEqual({ path: 'path' });
    expect(setParams[1]).toEqual(expect.objectContaining({
      binary: false,
      metadata: expect.any(RepresentationMetadata),
    }));
    expect(setParams[1].metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(setParams[1].data)).resolves.toBeRdfIsomorphic(quads);
  };

  it('only accepts SPARQL updates.', async(): Promise<void> => {
    const input = { identifier: { path: 'path' },
      patch: { algebra: {}} as SparqlUpdatePatch };
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    delete (input.patch as any).algebra;
    await expect(handler.canHandle(input)).rejects.toThrow(UnsupportedHttpError);
  });

  it('handles INSERT DATA updates.', async(): Promise<void> => {
    await handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(
        'INSERT DATA { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1>. ' +
        '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2> }',
        { quads: true },
      ) } as SparqlUpdatePatch });
    await basicChecks(startQuads.concat(
      [ quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
        quad(namedNode('http://test.com/s2'), namedNode('http://test.com/p2'), namedNode('http://test.com/o2')) ],
    ));
  });

  it('handles DELETE DATA updates.', async(): Promise<void> => {
    await handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(
        'DELETE DATA { <http://test.com/startS1> <http://test.com/startP1> <http://test.com/startO1> }',
        { quads: true },
      ) } as SparqlUpdatePatch });
    await basicChecks(
      [ quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')) ],
    );
  });

  it('handles DELETE WHERE updates with no variables.', async(): Promise<void> => {
    await handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(
        'DELETE WHERE { <http://test.com/startS1> <http://test.com/startP1> <http://test.com/startO1> }',
        { quads: true },
      ) } as SparqlUpdatePatch });
    await basicChecks(
      [ quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')) ],
    );
  });

  it('handles DELETE/INSERT updates with empty WHERE.', async(): Promise<void> => {
    await handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(
        'DELETE { <http://test.com/startS1> <http://test.com/startP1> <http://test.com/startO1> }\n' +
        'INSERT { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1>. }\n' +
        'WHERE {}',
        { quads: true },
      ) } as SparqlUpdatePatch });
    await basicChecks([
      quad(namedNode('http://test.com/startS2'),
        namedNode('http://test.com/startP2'),
        namedNode('http://test.com/startO2')),
      quad(namedNode('http://test.com/s1'),
        namedNode('http://test.com/p1'),
        namedNode('http://test.com/o1')),
    ]);
  });

  it('rejects GRAPH inserts.', async(): Promise<void> => {
    const handle = handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(
        'INSERT DATA { GRAPH <http://test.com/graph> { ' +
          '<http://test.com/startS1> <http://test.com/startP1> <http://test.com/startO1> } }',
        { quads: true },
      ) } as SparqlUpdatePatch });
    await expect(handle).rejects.toThrow('GRAPH statements are not supported.');
    expect(order).toEqual([]);
  });

  it('rejects GRAPH deletes.', async(): Promise<void> => {
    const handle = handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(
        'DELETE DATA { GRAPH <http://test.com/graph> { ' +
          '<http://test.com/startS1> <http://test.com/startP1> <http://test.com/startO1> } }',
        { quads: true },
      ) } as SparqlUpdatePatch });
    await expect(handle).rejects.toThrow('GRAPH statements are not supported.');
    expect(order).toEqual([]);
  });

  it('rejects DELETE/INSERT updates with a non-empty WHERE.', async(): Promise<void> => {
    const handle = handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(
        'DELETE { <http://test.com/startS1> <http://test.com/startP1> <http://test.com/startO1> }\n' +
        'INSERT { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1>. }\n' +
        'WHERE { ?s ?p ?o }',
        { quads: true },
      ) } as SparqlUpdatePatch });
    await expect(handle).rejects.toThrow('WHERE statements are not supported.');
    expect(order).toEqual([]);
  });

  it('rejects DELETE WHERE updates with variables.', async(): Promise<void> => {
    const handle = handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(
        'DELETE WHERE { ?v <http://test.com/startP1> <http://test.com/startO1> }',
        { quads: true },
      ) } as SparqlUpdatePatch });
    await expect(handle).rejects.toThrow('WHERE statements are not supported.');
    expect(order).toEqual([]);
  });

  it('rejects non-DELETE/INSERT updates.', async(): Promise<void> => {
    const handle = handler.handle({ identifier: { path: 'path' },
      patch: { algebra: translate(
        'MOVE DEFAULT TO GRAPH <http://test.com/newGraph>',
        { quads: true },
      ) } as SparqlUpdatePatch });
    await expect(handle).rejects.toThrow('Only DELETE/INSERT SPARQL update operations are supported.');
    expect(order).toEqual([]);
  });
});
