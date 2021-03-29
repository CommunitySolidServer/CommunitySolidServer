import { DataFactory } from 'n3';
import { getLoggerFor } from '../../../logging/LogUtil';
import { SOLID } from '../../../util/Vocabularies';
import { fetchDataset } from '../../util/FetchUtil';
import type { WebIdOwnershipValidator } from './WebIdOwnershipValidator';
const { literal, namedNode, quad } = DataFactory;

/**
 * Validates whether a WebId is okay to register based on if it
 * references this as an issuer.
 */
export class BasicIssuerReferenceWebIdOwnershipValidator implements WebIdOwnershipValidator {
  private readonly issuer: string;
  private readonly logger = getLoggerFor(this);

  public constructor(issuer: string) {
    this.issuer = issuer;
  }

  public async assertWebIdOwnership(webId: string, interactionId: string): Promise<void> {
    const dataset = await fetchDataset(webId);
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
