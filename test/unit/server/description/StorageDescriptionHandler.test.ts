import type { Quad } from '@rdfjs/types';
import { DataFactory } from 'n3';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import type { StorageDescriber } from '../../../../src/server/description/StorageDescriber';
import { StorageDescriptionHandler } from '../../../../src/server/description/StorageDescriptionHandler';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { readableToQuads } from '../../../../src/util/StreamUtil';
import { PIM, RDF } from '../../../../src/util/Vocabularies';
import quad = DataFactory.quad;
import namedNode = DataFactory.namedNode;

describe('A StorageDescriptionHandler', (): void => {
  const path = '.well-known/solid';
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let operation: Operation;
  let representation: Representation;
  let store: jest.Mocked<ResourceStore>;
  let describer: jest.Mocked<StorageDescriber>;
  let handler: StorageDescriptionHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: `http://example.com/${path}` },
      body: new BasicRepresentation(),
      preferences: {},
    };

    representation = new BasicRepresentation();
    representation.metadata.add(RDF.terms.type, PIM.terms.Storage);

    store = {
      getRepresentation: jest.fn().mockResolvedValue(representation),
    } as any;

    describer = {
      canHandle: jest.fn(),
      handle: jest.fn(async(target): Promise<Quad[]> =>
        [ quad(namedNode(target.path), RDF.terms.type, PIM.terms.Storage) ]),
    } as any;

    handler = new StorageDescriptionHandler(store, path, describer);
  });

  it('only handles GET requests.', async(): Promise<void> => {
    operation.method = 'POST';
    await expect(handler.canHandle({ request, response, operation }))
      .rejects.toThrow('Only GET requests can target the storage description.');
    expect(store.getRepresentation).toHaveBeenCalledTimes(0);
  });

  it('requires the corresponding container to be a pim:Storage.', async(): Promise<void> => {
    representation.metadata.removeAll(RDF.terms.type);
    await expect(handler.canHandle({ request, response, operation }))
      .rejects.toThrow('Only supports descriptions of storage containers.');
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenLastCalledWith({ path: 'http://example.com/' }, {});
  });

  it('makes sure the describer can handle the input.', async(): Promise<void> => {
    describer.canHandle.mockRejectedValue(new Error('bad input'));
    await expect(handler.canHandle({ request, response, operation }))
      .rejects.toThrow('bad input');
  });

  it('can handle valid input.', async(): Promise<void> => {
    await expect(handler.canHandle({ request, response, operation }))
      .resolves.toBeUndefined();
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenLastCalledWith({ path: 'http://example.com/' }, {});
    expect(describer.canHandle).toHaveBeenCalledTimes(1);
    expect(describer.canHandle).toHaveBeenLastCalledWith(operation.target);
  });

  it('converts the quads from its describer into a response.', async(): Promise<void> => {
    const result = await handler.handle({ request, response, operation });
    expect(result.statusCode).toBe(200);
    expect(result.metadata?.contentType).toBe('internal/quads');
    expect(result.data).toBeDefined();
    const quads = await readableToQuads(result.data!);
    expect(quads.countQuads('http://example.com/', RDF.terms.type, PIM.terms.Storage, null)).toBe(1);
    expect(describer.handle).toHaveBeenCalledTimes(1);
    expect(describer.handle).toHaveBeenLastCalledWith({ path: 'http://example.com/' });
  });
});
