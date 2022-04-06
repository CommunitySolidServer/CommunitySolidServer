import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import type { Algebra } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import type { SparqlUpdatePatch } from '../../../../src';
import { guardedStreamFrom, RepresentationMetadata, SparqlUpdatePatcher } from '../../../../src';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { ImmutableMetadataPatcher } from '../../../../src/storage/patch/ImmutableMetadataPatcher';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
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

describe('A RdfImmutableCheckPatcher', (): void => {
  const base = 'http://test.com/';
  const identifier = { path: 'http://test.com/foo' };
  const metaIdentifier = { path: 'http://test.com/foo.meta' };
  const dataInsert = 'INSERT DATA { :s1 :p1 :o1 . :s2 :p2 :o2 . }';

  let patcher: SparqlUpdatePatcher;
  let handler: ImmutableMetadataPatcher;
  let metaStrategy: SimpleSuffixStrategy;
  let representation = new BasicRepresentation([], 'internal/quads');

  beforeEach(async(): Promise<void> => {
    patcher = new SparqlUpdatePatcher();
    metaStrategy = new SimpleSuffixStrategy('.meta');
    representation = new BasicRepresentation([], 'internal/quads');

    handler = new ImmutableMetadataPatcher(patcher, metaStrategy);
  });

  it('handles patch without comparing input and patch stream.', async(): Promise<void> => {
    const patch = getPatch(dataInsert);
    const input = { representation, patch, identifier };
    const result = await handler.handleSafe(input);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
      quad(namedNode('http://test.com/s2'), namedNode('http://test.com/p2'), namedNode('http://test.com/o2')),
    ]);
  });

  it('handles patch that does not change immutable metadata.', async(): Promise<void> => {
    const patch = getPatch(dataInsert);
    const input = { representation, patch, identifier: metaIdentifier };
    const result = await handler.handleSafe(input);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
      quad(namedNode('http://test.com/s2'), namedNode('http://test.com/p2'), namedNode('http://test.com/o2')),
    ]);
  });

  it('rejects patches that adds ldp:contains triples in metadata.', async(): Promise<void> => {
    const patch = getPatch(`INSERT DATA { <${identifier.path}> <${LDP.contains}> :resource .}`);
    const input = { representation, patch, identifier: metaIdentifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
  });

  it('rejects patches that adds pim:storage triples in metadata.', async(): Promise<void> => {
    const patch = getPatch(`INSERT DATA { <${identifier.path}> a <${PIM.Storage}> .}`);
    const input = { representation, patch, identifier: metaIdentifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
  });

  it('reject patches that removes ldp:contains triples from metadata.', async(): Promise<void> => {
    const patch = getPatch(`DELETE DATA { <${identifier.path}> <${LDP.contains}> :resource .}`);
    representation = new BasicRepresentation([
      quad(namedNode(identifier.path), namedNode(LDP.contains), namedNode(`${base}resource`)) ], INTERNAL_QUADS);
    const input = { representation, patch, identifier: metaIdentifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
  });

  it('reject patches that removes pim:storage triples from metadata.', async(): Promise<void> => {
    const patch = getPatch(`DELETE DATA { <${identifier.path}> a <${PIM.Storage}> .}`);
    representation = new BasicRepresentation([
      quad(namedNode(identifier.path), namedNode(RDF.type), namedNode(PIM.Storage)) ], INTERNAL_QUADS);
    const input = { representation, patch, identifier: metaIdentifier };
    await expect(handler.handleSafe(input)).rejects.toThrow(ConflictHttpError);
  });

  it('handles patches when no representation is present.', async(): Promise<void> => {
    const patch = getPatch(`INSERT DATA { <${identifier.path}> <${LDP.contains}> :resource .}`);
    const input = { representation: undefined, patch, identifier };
    const result = await handler.handleSafe(input);
    const resultQuads = await arrayifyStream(result.data);
    expect(resultQuads).toBeRdfIsomorphic([
      quad(namedNode(identifier.path), namedNode(LDP.contains), namedNode(`${base}resource`)) ]);
  });
});
