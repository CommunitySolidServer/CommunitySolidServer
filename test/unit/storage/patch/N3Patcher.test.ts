import 'jest-rdf';
import { DataFactory, Store } from 'n3';
import type { SparqlUpdatePatch } from '../../../../src';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { N3Patch } from '../../../../src/http/representation/N3Patch';
import { N3Patcher } from '../../../../src/storage/patch/N3Patcher';
import type { RdfStorePatcherInput } from '../../../../src/storage/patch/RdfStorePatcher';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
const { namedNode, quad, variable } = DataFactory;

describe('An N3Patcher', (): void => {
  let patch: N3Patch;
  let input: RdfStorePatcherInput;
  const patcher = new N3Patcher();
  let store: Store;

  beforeEach(async(): Promise<void> => {
    patch = new BasicRepresentation() as N3Patch;
    patch.deletes = [];
    patch.inserts = [];
    patch.conditions = [];

    store = new Store();

    input = {
      patch,
      identifier: { path: 'http://example.com/foo' },
      store,
    };
  });

  it('can only handle N3 Patches.', async(): Promise<void> => {
    await expect(patcher.canHandle(input)).resolves.toBeUndefined();
    input.patch = { algebra: {}} as SparqlUpdatePatch;
    await expect(patcher.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the input representation for an empty patch.', async(): Promise<void> => {
    patch.deletes = [];
    patch.inserts = [];
    patch.conditions = [];
    const result = await patcher.handle(input);
    expect(result).toBe(store);
  });

  it('can delete and insert triples.', async(): Promise<void> => {
    patch.deletes = [ quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')) ];
    patch.inserts = [ quad(namedNode('ex:s2'), namedNode('ex:p2'), namedNode('ex:o2')) ];
    input.store.addQuads([
      quad(namedNode('ex:s0'), namedNode('ex:p0'), namedNode('ex:o0')),
      quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')),
    ]);
    const result = await patcher.handle(input);
    expect(result).toBeRdfIsomorphic([
      quad(namedNode('ex:s0'), namedNode('ex:p0'), namedNode('ex:o0')),
      quad(namedNode('ex:s2'), namedNode('ex:p2'), namedNode('ex:o2')),
    ]);
  });

  it('can create new representations using insert.', async(): Promise<void> => {
    patch.inserts = [ quad(namedNode('ex:s2'), namedNode('ex:p2'), namedNode('ex:o2')) ];
    const result = await patcher.handle(input);
    expect(result).toBeRdfIsomorphic([
      quad(namedNode('ex:s2'), namedNode('ex:p2'), namedNode('ex:o2')),
    ]);
  });

  it('can use conditions to target specific triples.', async(): Promise<void> => {
    patch.conditions = [ quad(variable('v'), namedNode('ex:p1'), namedNode('ex:o1')) ];
    patch.deletes = [ quad(variable('v'), namedNode('ex:p1'), namedNode('ex:o1')) ];
    patch.inserts = [ quad(variable('v'), namedNode('ex:p2'), namedNode('ex:o2')) ];
    input.store.addQuads([
      quad(namedNode('ex:s0'), namedNode('ex:p0'), namedNode('ex:o0')),
      quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')),
    ]);
    const result = await patcher.handle(input);
    expect(result).toBeRdfIsomorphic([
      quad(namedNode('ex:s0'), namedNode('ex:p0'), namedNode('ex:o0')),
      quad(namedNode('ex:s1'), namedNode('ex:p2'), namedNode('ex:o2')),
    ]);
  });

  it('errors if the conditions find no match.', async(): Promise<void> => {
    patch.conditions = [ quad(variable('v'), namedNode('ex:p3'), namedNode('ex:o3')) ];
    input.store.addQuads([
      quad(namedNode('ex:s0'), namedNode('ex:p0'), namedNode('ex:o0')),
      quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')),
    ]);
    const prom = patcher.handle(input);
    await expect(prom).rejects.toThrow(ConflictHttpError);
    await expect(prom).rejects.toThrow(
      'The document does not contain any matches for the N3 Patch solid:where condition.',
    );
  });

  it('errors if the conditions find multiple matches.', async(): Promise<void> => {
    patch.conditions = [ quad(variable('v'), namedNode('ex:p0'), namedNode('ex:o0')) ];
    input.store.addQuads([
      quad(namedNode('ex:s0'), namedNode('ex:p0'), namedNode('ex:o0')),
      quad(namedNode('ex:s1'), namedNode('ex:p0'), namedNode('ex:o0')),
    ]);
    const prom = patcher.handle(input);
    await expect(prom).rejects.toThrow(ConflictHttpError);
    await expect(prom).rejects.toThrow(
      'The document contains multiple matches for the N3 Patch solid:where condition, which is not allowed.',
    );
  });

  it('errors if the delete triples have no match.', async(): Promise<void> => {
    patch.deletes = [ quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')) ];
    input.store.addQuads([
      quad(namedNode('ex:s0'), namedNode('ex:p0'), namedNode('ex:o0')),
    ]);
    const prom = patcher.handle(input);
    await expect(prom).rejects.toThrow(ConflictHttpError);
    await expect(prom).rejects.toThrow(
      'The document does not contain all triples the N3 Patch requests to delete, which is required for patching.',
    );
  });

  it('works correctly if there are duplicate delete triples.', async(): Promise<void> => {
    patch.conditions = [ quad(variable('v'), namedNode('ex:p1'), namedNode('ex:o1')) ];
    patch.deletes = [
      quad(variable('v'), namedNode('ex:p1'), namedNode('ex:o1')),
      quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')),
    ];
    input.store.addQuads([
      quad(namedNode('ex:s0'), namedNode('ex:p0'), namedNode('ex:o0')),
      quad(namedNode('ex:s1'), namedNode('ex:p1'), namedNode('ex:o1')),
    ]);
    const result = await patcher.handle(input);
    expect(result).toBeRdfIsomorphic([
      quad(namedNode('ex:s0'), namedNode('ex:p0'), namedNode('ex:o0')),
    ]);
  });
});
