/* eslint-disable @typescript-eslint/naming-convention */
import { namedNode } from '@rdfjs/dataset';
import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { AnyPointer } from 'clownface';
import clownface from 'clownface';
import type { Adapter, AdapterPayload } from 'oidc-provider';
import type { DatasetCore } from 'rdf-js';
import { StorageAdapterFacotry } from './StorageAdapterFactory';

const SOLID_REGISTRATION = namedNode('http://www.w3.org/ns/solid/terms#oidcRegistration');

export class ClientWebIdFetchingStorageAdapter implements Adapter {
  private readonly adapter: Adapter;
  private readonly name: string;

  public constructor(
    name: string,
    wrappedAdapterFactory: StorageAdapterFacotry,
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
    // see if it's a valide Client WebId
    if (!payload && this.name === 'Client') {
      try {
        // Fetch and parse the Client WebId document
        let rawResponse: DatasetResponse<DatasetCore>;
        try {
          rawResponse = (await fetch(id)) as DatasetResponse<DatasetCore>;
        } catch {
          throw new Error('Cannot fetch WebId');
        }
        let dataset: AnyPointer;
        try {
          dataset = clownface({
            dataset: await rawResponse.dataset(),
          });
        } catch {
          throw new Error('Could not parse WebId rdf');
        }

        // Get the OIDC Registration JSON
        const rawRegistrationJSON = dataset.out(SOLID_REGISTRATION).value;
        if (!rawRegistrationJSON) {
          throw new Error('No solid:oidcRegistration field');
        }
        let registrationJSON;
        try {
          registrationJSON = JSON.parse(rawRegistrationJSON);
        } catch {
          throw new Error('Could not parse registration JSON');
        }

        // Ensure the registration JSON matches the client WebId
        if (id !== registrationJSON.client_id) {
          throw new Error('The client registration `client_id` field must match the Client WebId');
        }

        return {
          ...registrationJSON,
          token_endpoint_auth_method: 'none',
        };
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

export class ClientWebIdFetchingStorageAdapterFactory extends StorageAdapterFacotry {
  private readonly adapterFactory: StorageAdapterFacotry;

  public constructor(wrappedAdapterFactory: StorageAdapterFacotry) {
    super();
    this.adapterFactory = wrappedAdapterFactory;
  }

  public createStorageAdapter(name: string): Adapter {
    return new ClientWebIdFetchingStorageAdapter(name, this.adapterFactory);
  }
}
