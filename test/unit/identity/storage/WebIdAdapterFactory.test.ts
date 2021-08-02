import fetch from 'cross-fetch';
import type { Adapter } from 'oidc-provider';
import type { AdapterFactory } from '../../../../src/identity/storage/AdapterFactory';
import { WebIdAdapterFactory } from '../../../../src/identity/storage/WebIdAdapterFactory';
import { RdfToQuadConverter } from '../../../../src/storage/conversion/RdfToQuadConverter';

jest.mock('cross-fetch');

/* eslint-disable @typescript-eslint/naming-convention */
describe('A WebIdAdapterFactory', (): void => {
  const fetchMock: jest.Mock = fetch as any;
  const id = 'https://app.test.com/card#me';
  let json: any;
  let rdf: string;
  let source: Adapter;
  let sourceFactory: AdapterFactory;
  let adapter: Adapter;
  const converter = new RdfToQuadConverter();
  let factory: WebIdAdapterFactory;

  beforeEach(async(): Promise<void> => {
    json = {
      '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',

      client_id: id,
      client_name: 'Solid Application Name',
      redirect_uris: [ 'http://test.com/' ],
      scope: 'openid profile offline_access',
      grant_types: [ 'refresh_token', 'authorization_code' ],
      response_types: [ 'code' ],
      default_max_age: 3600,
      require_auth_time: true,
    };
    rdf = `<${id}> <http://www.w3.org/ns/solid/oidc#redirect_uris> <http://test.com>.`;

    fetchMock.mockImplementation((url: string): any => ({ text: (): any => '', url, status: 200 }));

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

    factory = new WebIdAdapterFactory(sourceFactory, converter);
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

  it('returns the source payload if there is one.', async(): Promise<void> => {
    (source.find as jest.Mock).mockResolvedValueOnce('payload!');
    await expect(adapter.find(id)).resolves.toBe('payload!');
  });

  it('returns undefined if this is not a Client Adapter and there is no source payload.', async(): Promise<void> => {
    adapter = factory.createStorageAdapter('NotClient');
    await expect(adapter.find(id)).resolves.toBeUndefined();
  });

  it('returns undefined if the client ID is not a URL.', async(): Promise<void> => {
    await expect(adapter.find('noUrl')).resolves.toBeUndefined();
  });

  it('errors if the client ID is unsecure.', async(): Promise<void> => {
    await expect(adapter.find('http://unsecure')).rejects
      .toThrow('SSL is required for client_id authentication unless working locally.');
  });

  it('errors if the client ID requests does not respond with 200.', async(): Promise<void> => {
    fetchMock.mockResolvedValueOnce({ url: id, status: 400, text: (): string => 'error' });
    await expect(adapter.find(id)).rejects.toThrow(`Unable to access data at ${id}: error`);
  });

  it('can handle a valid JSON-LD response.', async(): Promise<void> => {
    fetchMock.mockResolvedValueOnce({ url: id, status: 200, text: (): string => JSON.stringify(json) });
    await expect(adapter.find(id)).resolves.toEqual({
      ...json,
      token_endpoint_auth_method: 'none',
    });
  });

  it('errors if there is a client_id mismatch.', async(): Promise<void> => {
    json.client_id = 'someone else';
    fetchMock.mockResolvedValueOnce({ url: id, status: 200, text: (): string => JSON.stringify(json) });
    await expect(adapter.find(id)).rejects
      .toThrow('The client registration `client_id` field must match the client WebID');
  });

  it('can handle a valid RDF response.', async(): Promise<void> => {
    fetchMock.mockResolvedValueOnce(
      { url: id, status: 200, text: (): string => rdf, headers: { get: (): any => 'text/turtle' }},
    );
    await expect(adapter.find(id)).resolves.toEqual({
      client_id: id,
      redirect_uris: [ 'http://test.com' ],
      token_endpoint_auth_method: 'none',
    });
  });

  it('falls back to RDF parsing if no valid context was found.', async(): Promise<void> => {
    json = {
      '@id': 'https://app.test.com/card#me',
      'http://www.w3.org/ns/solid/oidc#redirect_uris': { '@id': 'http://test.com' },
      'http://randomField': { '@value': 'this will not be there since RDF parsing only takes preset fields' },
    };
    fetchMock.mockResolvedValueOnce(
      { url: id,
        status: 200,
        text: (): string => JSON.stringify(json),
        headers: { get: (): any => 'application/ld+json' }},
    );
    await expect(adapter.find(id)).resolves.toEqual({
      client_id: id,
      redirect_uris: [ 'http://test.com' ],
      token_endpoint_auth_method: 'none',
    });
  });

  it('errors if there is no content-type.', async(): Promise<void> => {
    fetchMock.mockResolvedValueOnce(
      { url: id, status: 200, text: (): string => rdf, headers: { get: jest.fn() }},
    );
    await expect(adapter.find(id)).rejects
      .toThrow(`Unable to access data at ${id}`);
  });
});
