import 'jest-rdf';
import { DataFactory, Store } from 'n3';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Patch } from '../../../../src/http/representation/Patch';
import type { RdfDatasetRepresentation } from '../../../../src/http/representation/RdfDatasetRepresentation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { ImmutableMetadataPatcher } from '../../../../src/storage/patch/ImmutableMetadataPatcher';
import type { RepresentationPatcherInput } from '../../../../src/storage/patch/RepresentationPatcher';
import type { SparqlUpdatePatcher } from '../../../../src/storage/patch/SparqlUpdatePatcher';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { FilterPattern } from '../../../../src/util/QuadUtil';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';
import { SimpleSuffixStrategy } from '../../../util/SimpleSuffixStrategy';

const { namedNode, quad } = DataFactory;

function getPatch(): Patch {
  const prefixedQuery = `This is a valid patch query`;
  return {
    data: guardedStreamFrom(prefixedQuery),
    metadata: new RepresentationMetadata(),
    binary: true,
    isEmpty: false,
  };
}

describe('A ImmutableMetadataPatcher', (): void => {
  const base = 'http://test.com/';
  const identifier = { path: 'http://test.com/foo' };
  const metaIdentifier = { path: 'http://test.com/foo.meta' };

  let patch: Patch;
  let patcher: SparqlUpdatePatcher;
  let handler: ImmutableMetadataPatcher;
  let metaStrategy: SimpleSuffixStrategy;
  let store: Store;
  let input: RepresentationPatcherInput<RdfDatasetRepresentation>;
  let representation: RdfDatasetRepresentation;

  beforeEach(async(): Promise<void> => {
    patcher = {
      canHandle: jest.fn(),
      handle: jest.fn(async(patcherInput: RepresentationPatcherInput<RdfDatasetRepresentation>):
      Promise<RdfDatasetRepresentation> => {
        const patcherStore = new Store([
          quad(namedNode(`${base}foo`), namedNode(`${base}p`), namedNode(`${base}o`)),
        ]);
        patcherInput.representation!.dataset = patcherStore;
        return patcherInput.representation!;
      }),
    } as any;
    metaStrategy = new SimpleSuffixStrategy('.meta');
    store = new Store();
    patch = getPatch();
    representation = new BasicRepresentation() as RdfDatasetRepresentation;
    representation.dataset = store;

    input = { representation, patch, identifier: metaIdentifier };
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(`${base}foo`, `${base}b`, `${base}c`),
    ]);
  });

  it('throws an error when trying to handle a non metadata resource identifier.', async(): Promise<void> => {
    input.identifier = identifier;
    await expect(handler.handleSafe(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('throws an error when no representation is given as input.', async(): Promise<void> => {
    input.representation = undefined;
    await expect(handler.handle(input)).rejects.toThrow(InternalServerError);
  });

  it('handles patches if they do not change immutable metadata.', async(): Promise<void> => {
    const result = await handler.handleSafe(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(namedNode(`${base}foo`), namedNode(`${base}p`), namedNode(`${base}o`)),
    ]);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('handles patches if there are no immutable patterns.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [ ]);

    const result = await handler.handleSafe(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(namedNode(`${base}foo`), namedNode(`${base}p`), namedNode(`${base}o`)),
    ]);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects patches that change immutable triples based on subject alone.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(`${base}foo`),
    ]);

    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects patches that change immutable triples based on predicate alone.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(undefined, `${base}p`),
    ]);

    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects patches that change immutable triples based on object alone.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(undefined, undefined, `${base}o`),
    ]);

    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects patches that change immutable triples based on predicate and object.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(undefined, `${base}p`, `${base}o`),
    ]);

    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('handles patches that changes triples where only a part is immutable.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(undefined, `${base}p`, `${base}o`),
    ]);
    jest.spyOn(patcher, 'handle').mockImplementation(
      async(patcherInput: RepresentationPatcherInput<RdfDatasetRepresentation>): Promise<RdfDatasetRepresentation> => {
        const patcherStore = new Store([
          quad(namedNode(`${base}a`), namedNode(`${base}p`), namedNode(`${base}c`)),
          quad(namedNode(`${base}a`), namedNode(`${base}b`), namedNode(`${base}o`)),
        ]);
        patcherInput.representation!.dataset = patcherStore;
        return patcherInput.representation!;
      },
    );

    const result = await handler.handleSafe(input);
    expect(result.dataset).toBeRdfIsomorphic([
      quad(namedNode(`${base}a`), namedNode(`${base}p`), namedNode(`${base}c`)),
      quad(namedNode(`${base}a`), namedNode(`${base}b`), namedNode(`${base}o`)),
    ]);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects patches that replaces immutable triples.', async(): Promise<void> => {
    input.representation!.dataset.addQuad(namedNode(identifier.path), namedNode(`${base}p`), namedNode(`${base}o1`));
    jest.spyOn(patcher, 'handle').mockImplementation(
      async(patcherInput: RepresentationPatcherInput<RdfDatasetRepresentation>): Promise<RdfDatasetRepresentation> => {
        const patcherStore = new Store([
          quad(namedNode(identifier.path), namedNode(`${base}p`), namedNode(`${base}o2`)),
        ]);
        patcherInput.representation!.dataset = patcherStore;
        return patcherInput.representation!;
      },
    );
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(`${base}foo`, `${base}p`),
    ]);

    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects patches that change immutable triples.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(`${base}foo`, `${base}p`, `${base}o`),
    ]);

    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects everything when ImmutableTriple has no arguments.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(),
    ]);

    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });
});
