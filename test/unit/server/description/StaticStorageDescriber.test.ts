import 'jest-rdf';
import { DataFactory } from 'n3';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { StaticStorageDescriber } from '../../../../src/server/description/StaticStorageDescriber';
import { LDP, PIM, RDF } from '../../../../src/util/Vocabularies';
import quad = DataFactory.quad;
import namedNode = DataFactory.namedNode;

describe('A StaticStorageDescriber', (): void => {
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };

  it('returns the stored triples.', async(): Promise<void> => {
    const describer = new StaticStorageDescriber({ [RDF.type]: PIM.Storage });
    await expect(describer.handle(target)).resolves.toEqualRdfQuadArray([
      quad(namedNode(target.path), RDF.terms.type, PIM.terms.Storage),
    ]);
  });

  it('errors if an input predicate does not represent a named node.', async(): Promise<void> => {
    expect((): any => new StaticStorageDescriber({ '"appelflap"': PIM.Storage }))
      .toThrow('Predicate needs to be a named node.');
  });

  it('accepts an array in the object position.', async(): Promise<void> => {
    const describer = new StaticStorageDescriber({ [RDF.type]: [ PIM.Storage, LDP.Resource ]});
    await expect(describer.handle(target)).resolves.toEqualRdfQuadArray([
      quad(namedNode(target.path), RDF.terms.type, PIM.terms.Storage),
      quad(namedNode(target.path), RDF.terms.type, LDP.terms.Resource),
    ]);
  });
});
