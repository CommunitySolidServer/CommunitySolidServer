import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import type { Quad } from 'n3';
import type { Adapter, AdapterPayload } from '../../../templates/types/oidc-provider';
import { getLoggerFor } from '../../logging/LogUtil';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { responseToDataset } from '../../util/FetchUtil';
import { hasScheme } from '../../util/HeaderUtil';
import { OIDC } from '../../util/Vocabularies';
import type { AdapterFactory } from './AdapterFactory';
import { PassthroughAdapter, PassthroughAdapterFactory } from './PassthroughAdapterFactory';

/**
 * This {@link Adapter} redirects the `find` call to its source adapter.
 * In case no client data was found in the source for the given Client ID,
 * this class will do an HTTP GET request to that Client ID.
 * If the result is a valid Client ID document, that will be returned instead.
 *
 * See https://solidproject.org/TR/2022/oidc-20220328#clientids-document.
 */
export class ClientIdAdapter extends PassthroughAdapter {
  protected readonly logger = getLoggerFor(this);

  private readonly converter: RepresentationConverter;

  public constructor(name: string, source: Adapter, converter: RepresentationConverter) {
    super(name, source);
    this.converter = converter;
  }

  public async find(id: string): Promise<AdapterPayload | void> {
    let payload = await this.source.find(id);

    // No payload is stored for the given Client ID.
    // Try to see if valid client metadata is found at the given Client ID.
    // The oidc-provider library will check if the redirect_uri matches an entry in the list of redirect_uris,
    // so no extra checks are needed from our side.
    if (!payload && this.name === 'Client' && hasScheme(id, 'http', 'https')) {
      this.logger.debug(`Looking for payload data at ${id}`);
      if (!/^https:|^http:\/\/localhost(?::\d+)?(?:\/|$)/u.test(id)) {
        throw new Error(`SSL is required for client_id authentication unless working locally.`);
      }
      const response = await fetch(id);
      if (response.status !== 200) {
        throw new Error(`Unable to access data at ${id}: ${await response.text()}`);
      }
      const data = await response.text();
      let json: Record<string, unknown> | undefined;
      try {
        json = JSON.parse(data) as Record<string, unknown>;
        const contexts = Array.isArray(json['@context']) ? json['@context'] : [ json['@context'] ];
        // We can only parse as simple JSON if the @context is correct
        if (!contexts.includes('https://www.w3.org/ns/solid/oidc-context.jsonld')) {
          throw new Error('Missing context https://www.w3.org/ns/solid/oidc-context.jsonld');
        }
      } catch (error: unknown) {
        json = undefined;
        this.logger.debug(`Found unexpected client ID for ${id}: ${createErrorMessage(error)}`);
      }

      if (json) {
        // Need to make sure the document is about the id
        if (json.client_id !== id) {
          throw new Error('The client registration `client_id` field must match the client ID');
        }
        payload = json;
      } else {
        // Since the client ID does not match the default JSON-LD we try to interpret it as RDF
        payload = await this.parseRdfClientId(data, id, response);
      }

      // `token_endpoint_auth_method: 'none'` prevents oidc-provider from requiring a client_secret
      // eslint-disable-next-line ts/naming-convention
      payload = { ...payload, token_endpoint_auth_method: 'none' };
    }

    // Will also be returned if no valid client data was found above
    return payload;
  }

  /**
   * Parses RDF data found at a Client ID.
   *
   * @param data - Raw data from the Client ID.
   * @param id - The actual Client ID.
   * @param response - Response object from the request.
   */
  private async parseRdfClientId(data: string, id: string, response: Response): Promise<AdapterPayload> {
    const representation = await responseToDataset(response, this.converter, data);

    // Find the valid redirect URIs
    const redirectUris: string[] = [];
    for await (const entry of representation.data) {
      const triple = entry as Quad;
      if (triple.predicate.equals(OIDC.terms.redirect_uris)) {
        redirectUris.push(triple.object.value);
      }
    }

    /* eslint-disable ts/naming-convention */
    return {
      client_id: id,
      redirect_uris: redirectUris,
    };
    /* eslint-enable ts/naming-convention */
  }
}

export class ClientIdAdapterFactory extends PassthroughAdapterFactory {
  private readonly converter: RepresentationConverter;

  public constructor(source: AdapterFactory, converter: RepresentationConverter) {
    super(source);
    this.converter = converter;
  }

  public createStorageAdapter(name: string): Adapter {
    return new ClientIdAdapter(name, this.source.createStorageAdapter(name), this.converter);
  }
}
