import { DataFactory } from 'n3';
import { v4 } from 'uuid';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { ExpiringStorage } from '../../../storage/keyvalue/ExpiringStorage';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { SOLID } from '../../../util/Vocabularies';
import { fetchDataset } from '../../util/FetchUtil';
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
      await this.storage.set(key, token, new Date(Date.now() + this.expiration));
      this.throwError(webId, token);
    }

    // Verify if the token can be found in the WebId
    const dataset = await fetchDataset(webId);
    const expectedQuad = quad(namedNode(webId), SOLID.terms.oidcIssuerRegistrationToken, literal(token));
    if (!dataset.has(expectedQuad)) {
      this.throwError(webId, token);
    }
    await this.storage.delete(key);
  }

  /**
   * Creates a key to use with the token storage.
   */
  private getTokenKey(webId: string): string {
    return `ownershipToken${webId}`;
  }

  /**
   * Generates a random verification token;
   */
  private generateToken(): string {
    return v4();
  }

  /**
   * Throws an error containing the description of which triple is needed for verification.
   */
  private throwError(webId: string, token: string): never {
    this.logger.debug(`Missing verification token at ${webId}`);
    const errorMessage = [
      `<${webId}> <${SOLID.terms.oidcIssuerRegistrationToken.value}> "${token}" .`,
      'Must be added to the WebId',
    ].join('\n');
    throw new BadRequestHttpError(errorMessage);
  }
}
