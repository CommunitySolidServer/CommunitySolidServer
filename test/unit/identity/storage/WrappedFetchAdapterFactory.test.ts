import { literal, namedNode, quad } from '@rdfjs/data-model';
import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { Adapter } from 'oidc-provider';
import type { Dataset, Quad, Term } from 'rdf-js';
import type { AdapterFactory } from '../../../../src/identity/storage/AdapterFactory';
import { WrappedFetchAdapterFactory } from '../../../../src/identity/storage/WrappedFetchAdapterFactory';
import { SOLID } from '../../../../src/util/Vocabularies';

jest.mock('@rdfjs/fetch');

describe('A WrappedFetchAdapterFactory', (): void => {
  const fetchMock: jest.Mock = fetch as any;
  let triples: Quad[];
  const id = 'http://alice.test.com/card#me';
  let source: Adapter;
  let sourceFactory: AdapterFactory;
  let adapter: Adapter;
  let factory: WrappedFetchAdapterFactory;

  beforeEach(async(): Promise<void> => {
    triples = [];

    const dataset: Dataset = {
      match: (subject: Term, predicate: Term): Quad[] => triples.filter((triple): boolean =>
        triple.subject.equals(subject) && triple.predicate.equals(predicate)),
    } as any;

    const rawResponse: DatasetResponse<Dataset> = {
      dataset: async(): Promise<Dataset> => dataset,
    } as any;

    fetchMock.mockReturnValue(rawResponse);

    source = {
      upsert: jest.fn(),
      find: jest.fn(),
      findByUserCode: jest.fn(),
      findByUid: jest.fn(),
      destroy: jest.fn(),
      revokeByGrantId: jest.fn(),
      consume: jest.fn(),
    };

    sourceFactory = {
      createStorageAdapter: jest.fn().mockReturnValue(source),
    };

    factory = new WrappedFetchAdapterFactory(sourceFactory);
    adapter = factory.createStorageAdapter('Client');
  });

  it('passes the call to the source for upsert.', async(): Promise<void> => {
    await expect(adapter.upsert('id', 'payload' as any, 5)).resolves.toBeUndefined();
    expect(source.upsert).toHaveBeenCalledTimes(1);
    expect(source.upsert).toHaveBeenLastCalledWith('id', 'payload' as any, 5);
  });

  it('passes the call to the source for findByUserCode.', async(): Promise<void> => {
    await expect(adapter.findByUserCode('userCode')).resolves.toBeUndefined();
    expect(source.findByUserCode).toHaveBeenCalledTimes(1);
    expect(source.findByUserCode).toHaveBeenLastCalledWith('userCode');
  });

  it('passes the call to the source for findByUid.', async(): Promise<void> => {
    await expect(adapter.findByUid('uid')).resolves.toBeUndefined();
    expect(source.findByUid).toHaveBeenCalledTimes(1);
    expect(source.findByUid).toHaveBeenLastCalledWith('uid');
  });

  it('passes the call to the source for destroy.', async(): Promise<void> => {
    await expect(adapter.destroy('id')).resolves.toBeUndefined();
    expect(source.destroy).toHaveBeenCalledTimes(1);
    expect(source.destroy).toHaveBeenLastCalledWith('id');
  });

  it('passes the call to the source for revokeByGrantId.', async(): Promise<void> => {
    await expect(adapter.revokeByGrantId('grantId')).resolves.toBeUndefined();
    expect(source.revokeByGrantId).toHaveBeenCalledTimes(1);
    expect(source.revokeByGrantId).toHaveBeenLastCalledWith('grantId');
  });

  it('passes the call to the source for consume.', async(): Promise<void> => {
    await expect(adapter.consume('id')).resolves.toBeUndefined();
    expect(source.consume).toHaveBeenCalledTimes(1);
    expect(source.consume).toHaveBeenLastCalledWith('id');
  });

  it('returns the source find payload if there is one.', async(): Promise<void> => {
    (source.find as jest.Mock).mockResolvedValueOnce('payload!');
    await expect(adapter.find(id)).resolves.toBe('payload!');
  });

  it('returns undefined if this is not a Client Adapter and there is no source payload.', async(): Promise<void> => {
    adapter = factory.createStorageAdapter('NotClient');
    await expect(adapter.find(id)).resolves.toBeUndefined();
  });

  it('returns undefined if there was a problem accessing the id.', async(): Promise<void> => {
    fetchMock.mockRejectedValueOnce(new Error('bad data!'));
    await expect(adapter.find(id)).resolves.toBeUndefined();
  });

  it('returns undefined if there are no solid:oidcRegistration triples.', async(): Promise<void> => {
    triples = [
      quad(namedNode(id), namedNode('irrelevant'), literal('value')),
    ];
    await expect(adapter.find(id)).resolves.toBeUndefined();
  });

  it('returns undefined if there are no valid solid:oidcRegistration triples.', async(): Promise<void> => {
    triples = [
      quad(namedNode(id), namedNode('irrelevant'), literal('value')),
      quad(namedNode(id), SOLID.terms.oidcRegistration, literal('}{')),
    ];
    await expect(adapter.find(id)).resolves.toBeUndefined();
  });

  it('returns undefined if there are no matching solid:oidcRegistration triples.', async(): Promise<void> => {
    triples = [
      quad(namedNode(id), namedNode('irrelevant'), literal('value')),
      quad(namedNode(id), SOLID.terms.oidcRegistration, literal('}{')),
      quad(namedNode(id), SOLID.terms.oidcRegistration, literal('{ "client_id": "invalid_id" }')),
    ];
    await expect(adapter.find(id)).resolves.toBeUndefined();
  });

  it('returns a new payload if there is a registration match.', async(): Promise<void> => {
    triples = [
      quad(namedNode(id), namedNode('irrelevant'), literal('value')),
      quad(namedNode(id), SOLID.terms.oidcRegistration, literal('}{')),
      quad(namedNode(id), SOLID.terms.oidcRegistration, literal('{ "client_id": "invalid_id" }')),
      quad(namedNode(id), SOLID.terms.oidcRegistration, literal(`{ "client_id": "${id}" }`)),
    ];

    /* eslint-disable @typescript-eslint/naming-convention */
    await expect(adapter.find(id)).resolves.toEqual({
      client_id: id,
      token_endpoint_auth_method: 'none',
    });
  });
});
