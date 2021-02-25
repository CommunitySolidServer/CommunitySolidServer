import { namedNode } from '@rdfjs/dataset';
import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { Adapter, AdapterPayload } from 'oidc-provider';
import type { Dataset } from 'rdf-js';
import { SOLID } from '../../util/Vocabularies';
import { StorageAdapterFactory } from './StorageAdapterFactory';

export class ClientWebIdFetchingStorageAdapter implements Adapter {
  private readonly adapter: Adapter;
  private readonly name: string;

  public constructor(
    name: string,
    wrappedAdapterFactory: StorageAdapterFactory,
  ) {
    this.adapter = wrappedAdapterFactory.createStorageAdapter(name);
    this.name = name;
  }

  public async upsert(
    id: string,
    payload: AdapterPayload,
    expiresIn: number,
  ): Promise<undefined | void> {
    return this.adapter.upsert(id, payload, expiresIn);
  }

  public async find(id: string): Promise<AdapterPayload | undefined | void> {
    const payload = await this.adapter.find(id);

    // If we're looking up a Client and the Client is undefined, check to
    // see if it's a valid Client WebId
    if (!payload && this.name === 'Client') {
      try {
        // Fetch and parse the Client WebId document
        let rawResponse: DatasetResponse<Dataset>;
        try {
          rawResponse = (await fetch(id)) as DatasetResponse<Dataset>;
        } catch {
          throw new Error('Cannot fetch Client Id');
        }
        let dataset: Dataset;
        try {
          dataset = await rawResponse.dataset();
        } catch {
          throw new Error('Could not parse Client Id rdf');
        }

        // Get the OIDC Registration JSON
        const rawRegistrationJsonQuads = dataset
          .match(namedNode(id), SOLID.terms.oidcRegistration);
        if (rawRegistrationJsonQuads.size === 0) {
          throw new Error('No solid:oidcRegistration field');
        }

        // Check all the registrations to see if any are valid.
        let thrownError: unknown;
        for (const rawRegistrationJsonQuad of rawRegistrationJsonQuads) {
          try {
            const rawRegistrationJson = rawRegistrationJsonQuad.object.value;
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
          } catch (err: unknown) {
            thrownError = err;
          }
        }
        throw thrownError;
      } catch {
        // If an error is thrown, return the original payload
        return payload;
      }
    }
    return payload;
  }

  public async findByUserCode(
    userCode: string,
  ): Promise<AdapterPayload | undefined | void> {
    return this.adapter.findByUserCode(userCode);
  }

  public async findByUid(
    uid: string,
  ): Promise<AdapterPayload | undefined | void> {
    return this.adapter.findByUid(uid);
  }

  public async destroy(id: string): Promise<undefined | void> {
    return this.adapter.destroy(id);
  }

  public async revokeByGrantId(grantId: string): Promise<undefined | void> {
    return this.adapter.revokeByGrantId(grantId);
  }

  public async consume(id: string): Promise<undefined | void> {
    return this.adapter.consume(id);
  }
}

export class ClientWebIdFetchingStorageAdapterFactory extends StorageAdapterFactory {
  private readonly adapterFactory: StorageAdapterFactory;

  public constructor(wrappedAdapterFactory: StorageAdapterFactory) {
    super();
    this.adapterFactory = wrappedAdapterFactory;
  }

  public createStorageAdapter(name: string): Adapter {
    return new ClientWebIdFetchingStorageAdapter(name, this.adapterFactory);
  }
}
