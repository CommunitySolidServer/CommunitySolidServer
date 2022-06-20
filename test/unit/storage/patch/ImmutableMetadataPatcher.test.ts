import { DataFactory, Store } from 'n3';
import type { Patch } from '../../../../src/http/representation/Patch';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { ImmutableMetadataPatcher } from '../../../../src/storage/patch/ImmutableMetadataPatcher';
import type { RdfStorePatcherInput } from '../../../../src/storage/patch/RdfStorePatcher';
import type { SparqlUpdatePatcher } from '../../../../src/storage/patch/SparqlUpdatePatcher';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { FilterPattern } from '../../../../src/util/QuadUtil';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';
import { PIM, RDF } from '../../../../src/util/Vocabularies';
import { SimpleSuffixStrategy } from '../../../util/SimpleSuffixStrategy';
import 'jest-rdf';
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
  let input: RdfStorePatcherInput;

  beforeEach(async(): Promise<void> => {
    patcher = {
      canHandle: jest.fn(),
      handle: jest.fn(async(): Promise<Store> => new Store([
        quad(namedNode(`${base}s`), namedNode(`${base}p`), namedNode(`${base}o`)) ])),
    } as any;
    metaStrategy = new SimpleSuffixStrategy('.meta');
    store = new Store();
    patch = getPatch();
    input = { store, patch, identifier: metaIdentifier };
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(`${base}a`, `${base}b`, `${base}c`),
    ]);
  });

  it('throws an error when trying to handle a non metadata resource identifier.', async(): Promise<void> => {
    input.identifier = identifier;
    await expect(handler.handleSafe(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('handles patches if they do not change immutable metadata.', async(): Promise<void> => {
    const result = await handler.handleSafe(input);
    expect(result).toBeRdfIsomorphic([
      quad(namedNode(`${base}s`), namedNode(`${base}p`), namedNode(`${base}o`)),
    ]);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('handles patches if there are no immutable patterns.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [ ]);

    const result = await handler.handleSafe(input);
    expect(result).toBeRdfIsomorphic([
      quad(namedNode(`${base}s`), namedNode(`${base}p`), namedNode(`${base}o`)),
    ]);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects patches that change immutable triples based on subject alone.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(`${base}s`),
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
    patcher.handle = jest.fn(async(): Promise<Store> => new Store([
      quad(namedNode(`${base}a`), namedNode(`${base}p`), namedNode(`${base}c`)),
      quad(namedNode(`${base}a`), namedNode(`${base}b`), namedNode(`${base}o`)),
    ]));

    const result = await handler.handleSafe(input);
    expect(result).toBeRdfIsomorphic([
      quad(namedNode(`${base}a`), namedNode(`${base}p`), namedNode(`${base}c`)),
      quad(namedNode(`${base}a`), namedNode(`${base}b`), namedNode(`${base}o`)),
    ]);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects patches that replaces immutable triples.', async(): Promise<void> => {
    input.store.addQuad(namedNode(base), RDF.terms.type, PIM.terms.Storage);
    patcher.handle = jest.fn(async(): Promise<Store> => new Store([
      quad(namedNode(`${base}newRoot`), RDF.terms.type, PIM.terms.Storage),
    ]));
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(undefined, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/ns/pim/space#Storage'),
    ]);

    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(input);
  });

  it('rejects patches that change immutable triples.', async(): Promise<void> => {
    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new FilterPattern(`${base}s`, `${base}p`, `${base}o`),
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
