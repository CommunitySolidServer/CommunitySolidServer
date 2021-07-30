import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import type { Quad } from 'n3';
import type { Adapter, AdapterPayload } from 'oidc-provider';
import { getLoggerFor } from '../../logging/LogUtil';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { fetchDataset } from '../../util/FetchUtil';
import { OIDC } from '../../util/Vocabularies';
import type { AdapterFactory } from './AdapterFactory';

/* eslint-disable @typescript-eslint/naming-convention */

/**
 * This {@link Adapter} redirects the `find` call to its source adapter.
 * In case no client data was found in the source for the given WebId,
 * this class will do an HTTP GET request to that WebId.
 * If a valid `solid:oidcRegistration` triple is found there,
 * that data will be returned instead.
 */
export class WebIdAdapter implements Adapter {
  protected readonly logger = getLoggerFor(this);

  private readonly name: string;
  private readonly source: Adapter;
  private readonly converter: RepresentationConverter;

  public constructor(name: string, source: Adapter, converter: RepresentationConverter) {
    this.name = name;
    this.source = source;
    this.converter = converter;
  }

  public async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void> {
    return this.source.upsert(id, payload, expiresIn);
  }

  public async find(id: string): Promise<AdapterPayload | void> {
    let payload = await this.source.find(id);

    // No payload is stored for the given Client ID.
    // Try to see if valid client metadata is found at the given Client ID.
    // The oidc-provider library will check if the redirect_uri matches an entry in the list of redirect_uris,
    // so no extra checks are needed from our side.
    if (!payload && this.name === 'Client' && /^https?:\/\/.+/u.test(id)) {
      this.logger.debug(`Looking for payload data at ${id}`);
      // All checks based on https://solid.github.io/authentication-panel/solid-oidc/#clientids-webid
      if (!/^https:|^http:\/\/localhost(?::\d+)?(?:\/|$)/u.test(id)) {
        throw new Error(`SSL is required for client_id authentication unless working locally.`);
      }
      const response = await fetch(id);
      if (response.status !== 200) {
        throw new Error(`Unable to access data at ${id}: ${await response.text()}`);
      }
      const data = await response.text();
      let json: any | undefined;
      try {
        json = JSON.parse(data);
        // We can only parse as simple JSON if the @context is correct
        if (json['@context'] !== 'https://www.w3.org/ns/solid/oidc-context.jsonld') {
          throw new Error('Invalid context');
        }
      } catch (error: unknown) {
        json = undefined;
        this.logger.debug(`Found unexpected client WebID for ${id}: ${createErrorMessage(error)}`);
      }

      if (json) {
        // Need to make sure the document is about the id
        if (json.client_id !== id) {
          throw new Error('The client registration `client_id` field must match the client WebID');
        }
        payload = json;
      } else {
        // Since the WebID does not match the default JSON-LD we try to interpret it as RDF
        payload = await this.parseRdfWebId(data, id, response);
      }

      // `token_endpoint_auth_method: 'none'` prevents oidc-provider from requiring a client_secret
      payload = { ...payload, token_endpoint_auth_method: 'none' };
    }

    // Will also be returned if no valid client data was found above
    return payload;
  }

  /**
   * Parses RDF data found at a client WebID.
   * @param data - Raw data from the WebID.
   * @param id - The actual WebID.
   * @param response - Response object from the request.
   */
  private async parseRdfWebId(data: string, id: string, response: Response): Promise<AdapterPayload> {
    const representation = await fetchDataset(response, this.converter, data);

    // Find the valid redirect URIs
    const redirectUris: string[] = [];
    for await (const entry of representation.data) {
      const triple = entry as Quad;
      if (triple.predicate.equals(OIDC.terms.redirect_uris)) {
        redirectUris.push(triple.object.value);
      }
    }

    return {
      client_id: id,
      redirect_uris: redirectUris,
    };
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
}

export class WebIdAdapterFactory implements AdapterFactory {
  private readonly source: AdapterFactory;
  private readonly converter: RepresentationConverter;

  public constructor(source: AdapterFactory, converter: RepresentationConverter) {
    this.source = source;
    this.converter = converter;
  }

  public createStorageAdapter(name: string): Adapter {
    return new WebIdAdapter(name, this.source.createStorageAdapter(name), this.converter);
  }
}
