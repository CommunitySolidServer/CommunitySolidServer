import 'jest-rdf';
import { DataFactory as DF, Store } from 'n3';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { N3Patch } from '../../../../src/http/representation/N3Patch';
import type { RdfDatasetRepresentation } from '../../../../src/http/representation/RdfDatasetRepresentation';
import type { SparqlUpdatePatch } from '../../../../src/http/representation/SparqlUpdatePatch';
import { N3Patcher } from '../../../../src/storage/patch/N3Patcher';
import type { RepresentationPatcherInput } from '../../../../src/storage/patch/RepresentationPatcher';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('An N3Patcher', (): void => {
  let patch: N3Patch;
  let input: RepresentationPatcherInput<RdfDatasetRepresentation>;
  const patcher = new N3Patcher();
  let store: Store;

  beforeEach(async(): Promise<void> => {
    patch = new BasicRepresentation() as N3Patch;
    patch.deletes = [];
    patch.inserts = [];
    patch.conditions = [];

    store = new Store();

    const representation = new BasicRepresentation() as RdfDatasetRepresentation;
    representation.dataset = store;
    input = {
      patch,
      identifier: { path: 'http://example.com/foo' },
      representation,
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
    expect(result.dataset).toBe(store);
  });

  it('throws an error when no representation is given as input.', async(): Promise<void> => {
    input.representation = undefined;
    await expect(patcher.handle(input)).rejects.toThrow(InternalServerError);
  });

  it('can delete and insert triples.', async(): Promise<void> => {
    patch.deletes = [ DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')) ];
    patch.inserts = [ DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')) ];
    input.representation?.dataset.addQuads([
      DF.quad(DF.namedNode('ex:s0'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
      DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
    ]);
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      DF.quad(DF.namedNode('ex:s0'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
      DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
    ]);
  });

  it('can create new representations using insert.', async(): Promise<void> => {
    patch.inserts = [ DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')) ];
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
    ]);
  });

  it('can use conditions to target specific triples.', async(): Promise<void> => {
    patch.conditions = [ DF.quad(DF.variable('v'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')) ];
    patch.deletes = [ DF.quad(DF.variable('v'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')) ];
    patch.inserts = [ DF.quad(DF.variable('v'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')) ];
    input.representation?.dataset.addQuads([
      DF.quad(DF.namedNode('ex:s0'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
      DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
    ]);
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      DF.quad(DF.namedNode('ex:s0'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
      DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
    ]);
  });

  it('errors if the conditions find no match.', async(): Promise<void> => {
    patch.conditions = [ DF.quad(DF.variable('v'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3')) ];
    input.representation?.dataset.addQuads([
      DF.quad(DF.namedNode('ex:s0'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
      DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
    ]);
    const prom = patcher.handle(input);
    await expect(prom).rejects.toThrow(ConflictHttpError);
    await expect(prom).rejects.toThrow(
      'The document does not contain any matches for the N3 Patch solid:where condition.',
    );
  });

  it('errors if the conditions find multiple matches.', async(): Promise<void> => {
    patch.conditions = [ DF.quad(DF.variable('v'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')) ];
    input.representation?.dataset.addQuads([
      DF.quad(DF.namedNode('ex:s0'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
      DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
    ]);
    const prom = patcher.handle(input);
    await expect(prom).rejects.toThrow(ConflictHttpError);
    await expect(prom).rejects.toThrow(
      'The document contains multiple matches for the N3 Patch solid:where condition, which is not allowed.',
    );
  });

  it('errors if the delete triples have no match.', async(): Promise<void> => {
    patch.deletes = [ DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')) ];
    input.representation?.dataset.addQuads([
      DF.quad(DF.namedNode('ex:s0'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
    ]);
    const prom = patcher.handle(input);
    await expect(prom).rejects.toThrow(ConflictHttpError);
    await expect(prom).rejects.toThrow(
      'The document does not contain all triples the N3 Patch requests to delete, which is required for patching.',
    );
  });

  it('works correctly if there are duplicate delete triples.', async(): Promise<void> => {
    patch.conditions = [ DF.quad(DF.variable('v'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')) ];
    patch.deletes = [
      DF.quad(DF.variable('v'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
      DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
    ];
    input.representation?.dataset.addQuads([
      DF.quad(DF.namedNode('ex:s0'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
      DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
    ]);
    const result = await patcher.handle(input);
    expect(result.dataset).toBeRdfIsomorphic([
      DF.quad(DF.namedNode('ex:s0'), DF.namedNode('ex:p0'), DF.namedNode('ex:o0')),
    ]);
  });
});
