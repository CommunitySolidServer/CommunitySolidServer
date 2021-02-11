import { literal, namedNode, quad } from '@rdfjs/dataset';
import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { DatasetCore } from 'rdf-js';
import { WebIdOwnershipValidator } from './WebIdOwnershipValidator';

const SOLID_OIDC_ISSUER = namedNode(
  'http://www.w3.org/ns/solid/terms#oidcIssuer',
);
const SOLID_OIDC_ISSUER_REGISTRATION_TOKEN = namedNode(
  'http://www.w3.org/ns/solid/terms#oidcIssuerRegistrationToken',
);

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

  public async assertWebId(
    webId: string,
    interactionId: string,
  ): Promise<void> {
    let rawResponse: DatasetResponse<DatasetCore>;
    try {
      rawResponse = (await fetch(webId)) as DatasetResponse<DatasetCore>;
    } catch {
      throw new Error('Cannot fetch WebId');
    }
    let dataset: DatasetCore;
    try {
      dataset = await rawResponse.dataset();
    } catch {
      throw new Error('Could not parse WebId rdf');
    }
    const hasIssuer = dataset.has(
      quad(namedNode(webId), SOLID_OIDC_ISSUER, namedNode(this.issuer)),
    );
    const hasRegistrationToken = dataset.has(
      quad(
        namedNode(webId),
        SOLID_OIDC_ISSUER_REGISTRATION_TOKEN,
        literal(interactionId),
      ),
    );
    if (!hasIssuer || !hasRegistrationToken) {
      let errorMessage =
        !hasIssuer ?
          `<${webId}> <${SOLID_OIDC_ISSUER.value}> <${this.issuer}> .\n` :
          '';
      errorMessage = errorMessage.concat(
        !hasRegistrationToken ?
          `<${this.issuer}> <${SOLID_OIDC_ISSUER_REGISTRATION_TOKEN.value}> "${interactionId}" .\n` :
          '',
      );
      errorMessage = errorMessage.concat('Must be added to the WebId');
      throw new Error(errorMessage);
    }
  }
}
