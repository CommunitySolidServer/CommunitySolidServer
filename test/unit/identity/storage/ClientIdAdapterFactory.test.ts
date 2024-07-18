import fetch from 'cross-fetch';
import type { AdapterFactory } from '../../../../src/identity/storage/AdapterFactory';
import { ClientIdAdapterFactory } from '../../../../src/identity/storage/ClientIdAdapterFactory';
import { RdfToQuadConverter } from '../../../../src/storage/conversion/RdfToQuadConverter';
import type { Adapter } from '../../../../templates/types/oidc-provider';

jest.mock('cross-fetch');

describe('A ClientIdAdapterFactory', (): void => {
  const fetchMock: jest.Mock = fetch as any;
  const id = 'https://app.example.com/card#me';
  let json: any;
  let rdf: string;
  let source: jest.Mocked<Adapter>;
  let sourceFactory: AdapterFactory;
  let adapter: Adapter;
  const converter = new RdfToQuadConverter();
  let factory: ClientIdAdapterFactory;

  beforeEach(async(): Promise<void> => {
    json = {
      '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',

      client_id: id,
      client_name: 'Solid Application Name',
      redirect_uris: [ 'http://example.com/' ],
      scope: 'openid profile offline_access',
      grant_types: [ 'refresh_token', 'authorization_code' ],
      response_types: [ 'code' ],
      default_max_age: 3600,
      require_auth_time: true,
    };
    rdf = `<${id}> <http://www.w3.org/ns/solid/oidc#redirect_uris> <http://example.com>.`;

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

    factory = new ClientIdAdapterFactory(sourceFactory, converter);
    adapter = factory.createStorageAdapter('Client');
  });

  it('returns the source payload if there is one.', async(): Promise<void> => {
    source.find.mockResolvedValueOnce('payload!' as any);
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

  it('can handle a context array.', async(): Promise<void> => {
    json['@context'] = [ json['@context'] ];
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
      .toThrow('The client registration `client_id` field must match the client ID');
  });

  it('can handle a valid RDF response.', async(): Promise<void> => {
    fetchMock.mockResolvedValueOnce(
      { url: id, status: 200, text: (): string => rdf, headers: { get: (): any => 'text/turtle' }},
    );
    await expect(adapter.find(id)).resolves.toEqual({
      client_id: id,
      redirect_uris: [ 'http://example.com' ],
      token_endpoint_auth_method: 'none',
    });
  });

  it('falls back to RDF parsing if no valid context was found.', async(): Promise<void> => {
    json = {
      '@id': 'https://app.example.com/card#me',
      'http://www.w3.org/ns/solid/oidc#redirect_uris': { '@id': 'http://example.com' },
      'http://randomField': { '@value': 'this will not be there since RDF parsing only takes preset fields' },
    };
    fetchMock.mockResolvedValueOnce(
      {
        url: id,
        status: 200,
        text: (): string => JSON.stringify(json),
        headers: { get: (): any => 'application/ld+json' },
      },
    );
    await expect(adapter.find(id)).resolves.toEqual({
      client_id: id,
      redirect_uris: [ 'http://example.com' ],
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
