import type { Quad } from 'n3';
import { DataFactory } from 'n3';
import { v4 } from 'uuid';
import { getLoggerFor } from '../../logging/LogUtil';
import type { ExpiringStorage } from '../../storage/keyvalue/ExpiringStorage';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { errorTermsToMetadata } from '../../util/errors/HttpErrorUtil';
import { fetchDataset } from '../../util/FetchUtil';
import { SOLID } from '../../util/Vocabularies';
import { OwnershipValidator } from './OwnershipValidator';

const { literal, namedNode, quad } = DataFactory;

/**
 * Validates ownership of a WebId by seeing if a specific triple can be added.
 * `expiration` parameter is how long the token should be valid in minutes.
 */
export class TokenOwnershipValidator extends OwnershipValidator {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: ExpiringStorage<string, string>;
  private readonly expiration: number;

  public constructor(storage: ExpiringStorage<string, string>, expiration = 30) {
    super();
    this.storage = storage;
    // Convert minutes to milliseconds
    this.expiration = expiration * 60 * 1000;
  }

  public async handle({ webId }: { webId: string }): Promise<void> {
    const key = this.getTokenKey(webId);
    let token = await this.storage.get(key);

    // No reason to fetch the WebId if we don't have a token yet
    if (!token) {
      token = this.generateToken();
      await this.storage.set(key, token, this.expiration);
      this.throwError(webId, token);
    }

    // Verify if the token can be found in the WebId
    if (!await this.hasToken(webId, token)) {
      this.throwError(webId, token);
    }
    this.logger.debug(`Verified ownership of ${webId}`);
    await this.storage.delete(key);
  }

  /**
   * Creates a key to use with the token storage.
   */
  private getTokenKey(webId: string): string {
    return encodeURIComponent(webId);
  }

  /**
   * Generates a random verification token;
   */
  private generateToken(): string {
    return v4();
  }

  /**
   * Fetches data from the WebID to determine if the token is present.
   */
  private async hasToken(webId: string, token: string): Promise<boolean> {
    const representation = await fetchDataset(webId);
    const expectedQuad = quad(namedNode(webId), SOLID.terms.oidcIssuerRegistrationToken, literal(token));
    for await (const data of representation.data) {
      const triple = data as Quad;
      if (triple.equals(expectedQuad)) {
        representation.data.destroy();
        return true;
      }
    }
    return false;
  }

  /**
   * Throws an error containing the description of which triple is needed for verification.
   */
  private throwError(webId: string, token: string): never {
    this.logger.debug(`No verification token found for ${webId}`);
    const errorMessage = [
      'Verification token not found.',
      'Please add the RDF triple',
      `<${webId}> <${SOLID.oidcIssuerRegistrationToken}> "${token}".`,
      `to the WebID document at ${webId.replace(/#.*/u, '')}`,
      'to prove it belongs to you.',
      'You can remove this triple again after validation.',
    ].join(' ');
    const details = { quad: `<${webId}> <${SOLID.oidcIssuerRegistrationToken}> "${token}".` };
    throw new BadRequestHttpError(errorMessage, { metadata: errorTermsToMetadata(details) });
  }
}
