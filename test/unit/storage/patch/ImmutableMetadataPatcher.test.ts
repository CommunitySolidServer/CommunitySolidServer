import { DataFactory, Store } from 'n3';
import type { Algebra } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import { ImmutableTriple } from '../../../../dist';
import type { SparqlUpdatePatch } from '../../../../src';
import { guardedStreamFrom, RepresentationMetadata, SparqlUpdatePatcher } from '../../../../src';
import { ImmutableMetadataPatcher } from '../../../../src/storage/patch/ImmutableMetadataPatcher';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { LDP, PIM, RDF } from '../../../../src/util/Vocabularies';
import { SimpleSuffixStrategy } from '../../../util/SimpleSuffixStrategy';
import quad = DataFactory.quad;
import namedNode = DataFactory.namedNode;
import 'jest-rdf';

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

describe('A ImmutableMetadataPatcher', (): void => {
  const base = 'http://test.com/';
  const identifier = { path: 'http://test.com/foo' };
  const metaIdentifier = { path: 'http://test.com/foo.meta' };
  const dataInsert = 'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 . }';

  let patcher: SparqlUpdatePatcher;
  let handler: ImmutableMetadataPatcher;
  let metaStrategy: SimpleSuffixStrategy;
  let store: Store;

  beforeEach(async(): Promise<void> => {
    patcher = new SparqlUpdatePatcher();
    metaStrategy = new SimpleSuffixStrategy('.meta');
    store = new Store();

    handler = new ImmutableMetadataPatcher(patcher, metaStrategy, [
      new ImmutableTriple(undefined, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/ns/pim/space#Storage'),
      new ImmutableTriple(undefined, 'http://www.w3.org/ns/ldp#contains'),
    ]);
  });

  it('throws an error when trying to handle on a non metadata resource identifier.', async(): Promise<void> => {
    const patch = getPatch(dataInsert);
    const input = { store, patch, identifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('handles patch that does not change immutable metadata.', async(): Promise<void> => {
    const patch = getPatch(dataInsert);
    const input = { store, patch, identifier: metaIdentifier };
    const result = await handler.handleSafe(input);
    expect(result).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
      quad(namedNode('http://test.com/s2'), namedNode('http://test.com/p2'), namedNode('http://test.com/o2')),
    ]);
  });

  it('rejects patches that adds ldp:contains triples in metadata.', async(): Promise<void> => {
    const patch = getPatch(`INSERT DATA { <${identifier.path}> <${LDP.contains}> :resource .}`);
    const input = { store, patch, identifier: metaIdentifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
  });

  it('rejects patches that adds pim:storage triples in metadata.', async(): Promise<void> => {
    const patch = getPatch(`INSERT DATA { <${identifier.path}> a <${PIM.Storage}> .}`);
    const input = { store, patch, identifier: metaIdentifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
  });

  it('reject patches that removes ldp:contains triples from metadata.', async(): Promise<void> => {
    const patch = getPatch(`DELETE DATA { <${identifier.path}> <${LDP.contains}> :resource .}`);
    store.addQuad(namedNode(identifier.path), namedNode(LDP.contains), namedNode(`${base}resource`));
    const input = { store, patch, identifier: metaIdentifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
  });

  it('reject patches that removes pim:storage triples from metadata.', async(): Promise<void> => {
    const patch = getPatch(`DELETE DATA { <${identifier.path}> a <${PIM.Storage}> .}`);
    store.addQuad(namedNode(identifier.path), namedNode(RDF.type), namedNode(PIM.Storage));
    const input = { store, patch, identifier: metaIdentifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
  });

  it('reject patches that removes pim:storage triples from the metadata ' +
      'and adds an ldp:contains to the metadata.', async(): Promise<void> => {
    const patch = getPatch(`DELETE DATA { <${identifier.path}> a <${PIM.Storage}> .} ;
INSERT DATA { <${identifier.path}> <${LDP.contains}> <${identifier.path}/resource> }`);
    store.addQuad(namedNode(identifier.path), namedNode(RDF.type), namedNode(PIM.Storage));
    const input = { store, patch, identifier: metaIdentifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
  });
});
