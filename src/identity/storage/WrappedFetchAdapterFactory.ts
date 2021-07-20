import { DataFactory } from 'n3';
import type { Adapter, AdapterPayload } from 'oidc-provider';
import type { Dataset, Quad } from 'rdf-js';
import { getLoggerFor } from '../../logging/LogUtil';
import { fetchDataset } from '../../util/FetchUtil';
import { SOLID } from '../../util/Vocabularies';
import type { AdapterFactory } from './AdapterFactory';
import namedNode = DataFactory.namedNode;

/**
 * This {@link Adapter} redirects the `find` call to its source adapter.
 * In case no client data was found in the source for the given WebId,
 * this class will do an HTTP GET request to that WebId.
 * If a valid `solid:oidcRegistration` triple is found there,
 * that data will be returned instead.
 */
export class WrappedFetchAdapter implements Adapter {
  protected readonly logger = getLoggerFor(this);

  private readonly source: Adapter;
  private readonly name: string;

  public constructor(name: string, source: Adapter) {
    this.source = source;
    this.name = name;
  }

  public async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void> {
    return this.source.upsert(id, payload, expiresIn);
  }

  public async find(id: string): Promise<AdapterPayload | void> {
    const payload = await this.source.find(id);

    // No payload is stored for the given WebId.
    // Try to see if a solid:oidcRegistration triple is stored at the WebId that can be used instead.
    if (!payload && this.name === 'Client') {
      this.logger.debug(`Looking for payload data at ${id}`);
      let dataset: Dataset;
      try {
        dataset = await fetchDataset(id);
      } catch {
        this.logger.debug(`Looking for payload data failed at ${id}`);
        return payload;
      }

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
      this.logger.debug(`No payload data was found at ${id}`);
    }

    // Will also be returned if no valid registration data was found above
    return payload;
  }

  public async findByUserCode(userCode: string): Promise<AdapterPayload | void> {
    return this.source.findByUserCode(userCode);
  }

  public async findByUid(uid: string): Promise<AdapterPayload | void> {
    return this.source.findByUid(uid);
  }

  public async destroy(id: string): Promise<void> {
    return this.source.destroy(id);
  }

  public async revokeByGrantId(grantId: string): Promise<void> {
    return this.source.revokeByGrantId(grantId);
  }

  public async consume(id: string): Promise<void> {
    return this.source.consume(id);
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

export class WrappedFetchAdapterFactory implements AdapterFactory {
  private readonly source: AdapterFactory;

  public constructor(source: AdapterFactory) {
    this.source = source;
  }

  public createStorageAdapter(name: string): Adapter {
    return new WrappedFetchAdapter(name, this.source.createStorageAdapter(name));
  }
}
