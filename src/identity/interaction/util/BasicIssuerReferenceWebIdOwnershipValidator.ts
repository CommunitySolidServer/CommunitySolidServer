import { literal, namedNode, quad } from '@rdfjs/dataset';
import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { DatasetCore } from 'rdf-js';
import { getLoggerFor } from '../../../logging/LogUtil';
import { SOLID } from '../../../util/Vocabularies';
import { WebIdOwnershipValidator } from './WebIdOwnershipValidator';

/**
 * Validates whether a WebId is okay to register based on if it
 * references this as an issuer.
 */
export class BasicIssuerReferenceWebIdOwnershipValidator extends WebIdOwnershipValidator {
  private readonly issuer: string;
  private readonly logger = getLoggerFor(this);

  public constructor(issuer: string) {
    super();
    this.issuer = issuer;
  }

  public async assertWebIdOwnership(
    webId: string,
    interactionId: string,
  ): Promise<void> {
    let rawResponse: DatasetResponse<DatasetCore>;
    try {
      rawResponse = (await fetch(webId)) as DatasetResponse<DatasetCore>;
    } catch (err: unknown) {
      this.logger.error(err as string);
      throw new Error('Cannot fetch WebId');
    }
    let dataset: DatasetCore;
    try {
      dataset = await rawResponse.dataset();
    } catch (err: unknown) {
      this.logger.error(err as string);
      throw new Error(`Could not parse rdf in ${webId}`);
    }
    const hasIssuer = dataset.has(
      quad(namedNode(webId), SOLID.terms.oidcIssuer, namedNode(this.issuer)),
    );
    const hasRegistrationToken = dataset.has(
      quad(
        namedNode(webId),
        SOLID.terms.oidcIssuerRegistrationToken,
        literal(interactionId),
      ),
    );
    if (!hasIssuer || !hasRegistrationToken) {
      let errorMessage = !hasIssuer ?
        `<${webId}> <${SOLID.terms.oidcIssuer.value}> <${this.issuer}> .\n` :
        '';
      errorMessage += !hasRegistrationToken ?
        `<${webId}> <${SOLID.terms.oidcIssuerRegistrationToken.value}> "${interactionId}" .\n` :
        '';
      errorMessage += 'Must be added to the WebId';
      throw new Error(errorMessage);
    }
  }
}
