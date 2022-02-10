import type { SolidTokenVerifierFunction } from '@solid/access-token-verifier';
import { createSolidTokenVerifier } from '@solid/access-token-verifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpRequest } from '../server/HttpRequest';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { CredentialGroup } from './Credentials';
import type { CredentialSet } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';

export class BearerWebIdExtractor extends CredentialsExtractor {
  protected readonly logger = getLoggerFor(this);
  private readonly verify: SolidTokenVerifierFunction;

  public constructor() {
    super();
    this.verify = createSolidTokenVerifier();
  }

  public async canHandle({ headers }: HttpRequest): Promise<void> {
    const { authorization } = headers;
    if (!authorization || !/^Bearer /ui.test(authorization)) {
      throw new NotImplementedHttpError('No Bearer Authorization header specified.');
    }
  }

  public async handle(request: HttpRequest): Promise<CredentialSet> {
    const { headers: { authorization }} = request;

    try {
      const { webid: webId } = await this.verify(authorization!);
      this.logger.info(`Verified WebID via Bearer access token: ${webId}`);
      return { [CredentialGroup.agent]: { webId }};
    } catch (error: unknown) {
      const message = `Error verifying WebID via Bearer access token: ${(error as Error).message}`;
      this.logger.warn(message);
      throw new BadRequestHttpError(message, { cause: error });
    }
  }
}
