import type { Store } from 'n3';
import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Patch } from '../../../../src/http/representation/Patch';
import type { Representation } from '../../../../src/http/representation/Representation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { RdfPatcher } from '../../../../src/storage/patch/RdfPatcher';
import type { RdfStorePatcher, RdfStorePatcherInput } from '../../../../src/storage/patch/RdfStorePatcher';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { readableToQuads } from '../../../../src/util/StreamUtil';
import quad = DataFactory.quad;
import namedNode = DataFactory.namedNode;
import 'jest-rdf';

describe('An RdfPatcher,', (): void => {
  let patcher: jest.Mocked<RdfStorePatcher>;
  let startQuads: Quad[];
  let rdfPatcher: RdfPatcher;
  let identifier: ResourceIdentifier;
  let representation: Representation;
  let patch: Patch;

  beforeEach((): void => {
    startQuads = [ quad(
      namedNode('http://test.com/startS1'),
      namedNode('http://test.com/startP1'),
      namedNode('http://test.com/startO1'),
    ), quad(
      namedNode('http://test.com/startS2'),
      namedNode('http://test.com/startP2'),
      namedNode('http://test.com/startO2'),
    ) ];
    patcher = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      handleSafe: jest.fn(),
    };
    patcher.handleSafe.mockImplementation(
      async(input: RdfStorePatcherInput): Promise<Store> => Promise.resolve(input.store),
    );

    rdfPatcher = new RdfPatcher(patcher);
    representation = new BasicRepresentation(startQuads, 'internal/quads');
  });

  it('errors when the representation is of the wrong content type.', async(): Promise<void> => {
    representation = new BasicRepresentation(startQuads, 'text/turtle');

    await expect(rdfPatcher.handleSafe({ identifier, patch, representation })).rejects.toThrow(InternalServerError);
    await expect(rdfPatcher.handleSafe({ identifier, patch, representation })).rejects
      .toThrow('Quad stream was expected for patching.');
  });

  it('uses a new store when there is no representation to patch.', async(): Promise<void> => {
    const result = await rdfPatcher.handleSafe({ identifier, patch });
    const store = await readableToQuads(result.data);
    expect(store).toBeRdfIsomorphic([]);
  });

  it('transforms the representation to a store to patch.', async(): Promise<void> => {
    const result = await rdfPatcher.handleSafe({ identifier, patch, representation });
    const store = await readableToQuads(result.data);
    expect(store).toBeRdfIsomorphic(startQuads);
  });
});
