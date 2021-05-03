import { DataFactory } from 'n3';
import { getLoggerFor } from '../../../logging/LogUtil';
import { SOLID } from '../../../util/Vocabularies';
import { fetchDataset } from '../../util/FetchUtil';
import { OwnershipValidator } from './OwnershipValidator';
const { literal, namedNode, quad } = DataFactory;

/**
 * Validates if a WebID can be registered based on whether it references this as an issuer.
 */
export class IssuerOwnershipValidator extends OwnershipValidator {
  protected readonly logger = getLoggerFor(this);

  private readonly issuer: string;

  public constructor(issuer: string) {
    super();
    this.issuer = issuer;
  }

  public async handle({ webId, interactionId }: { webId: string; interactionId: string }): Promise<void> {
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
      this.logger.debug(`Missing issuer and/or registration token at ${webId}`);
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
