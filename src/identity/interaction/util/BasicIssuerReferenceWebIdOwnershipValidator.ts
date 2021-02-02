import { literal, namedNode } from '@rdfjs/dataset';
import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { AnyPointer } from 'clownface';
import clownface from 'clownface';
import type { DatasetCore } from 'rdf-js';
import { WebIdOwnershipValidator } from './WebIdOwnershipValidator';

const SOLID_OIDC_ISSUER = namedNode('http://www.w3.org/ns/solid/terms#oidcIssuer');
const SOLID_OIDC_ISSUER_REGISTRATION_TOKEN = namedNode('http://www.w3.org/ns/solid/terms#oidcIssuerRegistrationToken');

/**
 * Validates is a WebId is okay to register based on if it
 * references this as an issuer.
 *
 * Note: This file uses clownface because I like clownface.
 * If needed, we can refactor it to use whatever rdf library
 * Ruben prefers.
 */
export class BasicIssuerReferenceWebIdOwnershipValidator extends WebIdOwnershipValidator {
  private readonly issuer: string;

  public constructor(issuer: string) {
    super();
    this.issuer = issuer;
  }

  public async assertWebId(webId: string, interactionId: string): Promise<void> {
    let rawResponse: DatasetResponse<DatasetCore>;
    try {
      rawResponse = await fetch(webId) as DatasetResponse<DatasetCore>;
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
    const webIdNode = dataset.namedNode(namedNode(webId));
    const matchingIssuers = webIdNode.has(SOLID_OIDC_ISSUER, namedNode(this.issuer));
    const matchingInteractionId = webIdNode.has(SOLID_OIDC_ISSUER_REGISTRATION_TOKEN, literal(interactionId));
    if (matchingIssuers.values.length === 0 || matchingInteractionId.values.length === 0) {
      let errorMessage = matchingIssuers.values.length === 0 ? `<${webId}> <${SOLID_OIDC_ISSUER.value}> <${this.issuer}> .\n` : '' ;
      errorMessage = errorMessage.concat(matchingInteractionId.values.length === 0 ? `<${this.issuer}> <${SOLID_OIDC_ISSUER_REGISTRATION_TOKEN.value}> "${interactionId}" .\n` : '');
      errorMessage = errorMessage.concat('Must be added to the WebId')
      throw new Error(errorMessage);
    }
  }
}
