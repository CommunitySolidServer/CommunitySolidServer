import { DataFactory } from 'n3';
import type { Quad } from '@rdfjs/types';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { SingleContainerJsonStorage } from '../../../../src/init/migration/SingleContainerJsonStorage';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { isContainerIdentifier } from '../../../../src/util/PathUtil';
import { LDP } from '../../../../src/util/Vocabularies';

describe('A SingleContainerJsonStorage', (): void => {
  const baseUrl = 'http://example.com/';
  const container = '.internal/accounts/';
  let store: jest.Mocked<ResourceStore>;
  let storage: SingleContainerJsonStorage<any>;

  beforeEach(async(): Promise<void> => {
    store = {
      getRepresentation: jest.fn(async(id): Promise<Representation> => {
        if (isContainerIdentifier(id)) {
          // Container members are listed in the body.
          const members = [
            'http://example.com/.internal/accounts/foo',
            'http://example.com/.internal/accounts/bad',
            'http://example.com/.internal/accounts/bar/',
            'http://example.com/.internal/accounts/baz',
            'http://example.com/.internal/accounts/unknown',
          ];
          const quads = members.map((member): Quad =>
            DataFactory.quad(DataFactory.namedNode(id.path), LDP.terms.contains, DataFactory.namedNode(member)));
          // Ignore containment statements from child resources.
          quads.push(DataFactory.quad(
            DataFactory.namedNode(`${id.path}nested/`),
            LDP.terms.contains,
            DataFactory.namedNode(`${id.path}not-a-direct-member`),
          ));
          const containerNode = DataFactory.namedNode(id.path);
          quads.push(
            {} as unknown as Quad,
            { subject: containerNode } as unknown as Quad,
            { subject: containerNode, predicate: LDP.terms.contains } as unknown as Quad,
            DataFactory.quad(containerNode, DataFactory.namedNode('urn:other'), DataFactory.namedNode('urn:ignored')),
            DataFactory.quad(containerNode, LDP.terms.contains, DataFactory.literal('not-an-identifier')),
          );
          return new BasicRepresentation(quads, new RepresentationMetadata(id), INTERNAL_QUADS);
        }
        if (id.path.endsWith('unknown')) {
          throw new NotFoundHttpError();
        }
        if (id.path.endsWith('bad')) {
          return new BasicRepresentation(`invalid JSON`, 'application/json');
        }
        return new BasicRepresentation(`{ "id": "${id.path}" }`, 'application/json');
      }),
    } satisfies Partial<ResourceStore> as any;

    storage = new SingleContainerJsonStorage(store, baseUrl, container);
  });

  it('only iterates over the valid documents in the base container.', async(): Promise<void> => {
    const entries = [];
    for await (const entry of storage.entries()) {
      entries.push(entry);
    }
    expect(entries).toEqual([
      [ 'foo', { id: 'http://example.com/.internal/accounts/foo' }],
      [ 'baz', { id: 'http://example.com/.internal/accounts/baz' }],
    ]);
    expect(store.getRepresentation).toHaveBeenCalledTimes(5);
    expect(store.getRepresentation).toHaveBeenNthCalledWith(
      1,
      { path: 'http://example.com/.internal/accounts/' },
      {},
    );
    expect(store.getRepresentation).toHaveBeenNthCalledWith(
      2,
      { path: 'http://example.com/.internal/accounts/foo' },
      { type: { 'application/json': 1 }},
    );
    expect(store.getRepresentation).toHaveBeenNthCalledWith(
      3,
      { path: 'http://example.com/.internal/accounts/bad' },
      { type: { 'application/json': 1 }},
    );
    expect(store.getRepresentation).toHaveBeenNthCalledWith(
      4,
      { path: 'http://example.com/.internal/accounts/baz' },
      { type: { 'application/json': 1 }},
    );
    expect(store.getRepresentation).toHaveBeenNthCalledWith(
      5,
      { path: 'http://example.com/.internal/accounts/unknown' },
      { type: { 'application/json': 1 }},
    );
  });

  it('does nothing if the container does not exist.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValueOnce(new NotFoundHttpError());
    const entries = [];
    for await (const entry of storage.entries()) {
      entries.push(entry);
    }
    expect(entries).toHaveLength(0);
  });
});
