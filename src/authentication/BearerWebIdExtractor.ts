import type { SolidTokenVerifierFunction } from '@solid/identity-token-verifier';
import { createSolidTokenVerifier } from '@solid/identity-token-verifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpRequest } from '../server/HttpRequest';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Credentials } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';

/**
 * Credentials extractor that extracts a WebID from a Bearer access token.
 */
export class BearerWebIdExtractor extends CredentialsExtractor {
  protected readonly logger = getLoggerFor(this);
  private readonly verify: SolidTokenVerifierFunction;

  public constructor() {
    super();
    this.verify = createSolidTokenVerifier();
  }

  public async canHandle({ headers }: HttpRequest): Promise<void> {
    const { authorization } = headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new NotImplementedHttpError('No Bearer Authorization header specified.');
    }
  }

  public async handle(request: HttpRequest): Promise<Credentials> {
    const { headers: { authorization }} = request;

    try {
      const { webid: webId } = await this.verify(authorization as string);
      this.logger.info(`Verified WebID via Bearer access token: ${webId}`);
      return { webId };
    } catch (error: unknown) {
      const message = `Error verifying WebID via Bearer access token: ${(error as Error).message}`;
      this.logger.warn(message);
      throw new BadRequestHttpError(message);
    }
  }
}
