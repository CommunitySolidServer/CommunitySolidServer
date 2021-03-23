import { DataFactory } from 'n3';
import type { Adapter, AdapterPayload } from 'oidc-provider';
import type { Quad } from 'rdf-js';
import { SOLID } from '../../util/Vocabularies';
import { fetchDataset } from '../util/FetchUtil';
import { StorageAdapterFactory } from './StorageAdapterFactory';
import namedNode = DataFactory.namedNode;

/**
 * An Adapter that wraps around another Adapter and fetches data from the webId in case no client payload was found.
 */
export class ClientWebIdFetchingStorageAdapter implements Adapter {
  private readonly adapter: Adapter;
  private readonly name: string;

  public constructor(name: string, adapter: Adapter) {
    this.adapter = adapter;
    this.name = name;
  }

  public async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void> {
    return this.adapter.upsert(id, payload, expiresIn);
  }

  public async find(id: string): Promise<AdapterPayload | void> {
    const payload = await this.adapter.find(id);

    // If we're looking up a Client and the Client is undefined, check to
    // see if it's a valid Client WebId
    if (!payload && this.name === 'Client') {
      try {
        // Fetch and parse the Client WebId document
        const dataset = await fetchDataset(id);

        // Get the OIDC Registration JSON
        const rawRegistrationJsonQuads = dataset.match(namedNode(id), SOLID.terms.oidcRegistration);

        // Check all the registrations to see if any are valid.
        for (const rawRegistrationJsonQuad of rawRegistrationJsonQuads) {
          try {
            return this.validateRegistrationQuad(rawRegistrationJsonQuad, id);
          } catch {
            // Keep looking for a valid quad
          }
        }
      } catch {
        // If an error is thrown or no valid registration is found, return the original payload
        return payload;
      }
    }
    return payload;
  }

  public async findByUserCode(userCode: string): Promise<AdapterPayload | void> {
    return this.adapter.findByUserCode(userCode);
  }

  public async findByUid(uid: string): Promise<AdapterPayload | void> {
    return this.adapter.findByUid(uid);
  }

  public async destroy(id: string): Promise<void> {
    return this.adapter.destroy(id);
  }

  public async revokeByGrantId(grantId: string): Promise<void> {
    return this.adapter.revokeByGrantId(grantId);
  }

  public async consume(id: string): Promise<void> {
    return this.adapter.consume(id);
  }

  /**
   * Validates if the quad object contains valid JSON with the required client_id.
   * In case of success, the AdapterPayload will be returned, otherwise an error will be thrown.
   */
  private validateRegistrationQuad(quad: Quad, id: string): AdapterPayload {
    const rawRegistrationJson = quad.object.value;
    let registrationJson;
    try {
      registrationJson = JSON.parse(rawRegistrationJson);
    } catch {
      throw new Error('Could not parse registration JSON');
    }

    // Ensure the registration JSON matches the client WebId
    if (id !== registrationJson.client_id) {
      throw new Error('The client registration `client_id` field must match the Client WebId');
    }
    return {
      ...registrationJson,
      // Snake case is required for tokens
      // eslint-disable-next-line @typescript-eslint/naming-convention
      token_endpoint_auth_method: 'none',
    };
  }
}

export class ClientWebIdFetchingStorageAdapterFactory extends StorageAdapterFactory {
  private readonly adapterFactory: StorageAdapterFactory;

  public constructor(wrappedAdapterFactory: StorageAdapterFactory) {
    super();
    this.adapterFactory = wrappedAdapterFactory;
  }

  public createStorageAdapter(name: string): Adapter {
    return new ClientWebIdFetchingStorageAdapter(name, this.adapterFactory.createStorageAdapter(name));
  }
}
