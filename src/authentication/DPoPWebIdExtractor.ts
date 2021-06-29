import type { RequestMethod } from '@solid/identity-token-verifier';
import { createSolidTokenVerifier } from '@solid/identity-token-verifier';
import type { TargetExtractor } from '../ldp/http/TargetExtractor';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpRequest } from '../server/HttpRequest';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Credentials } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';

/**
 * Credentials extractor that extracts a WebID from a DPoP-bound access token.
 */
export class DPoPWebIdExtractor extends CredentialsExtractor {
  private readonly originalUrlExtractor: TargetExtractor;
  private readonly verify = createSolidTokenVerifier();
  protected readonly logger = getLoggerFor(this);

  /**
   * @param originalUrlExtractor - Reconstructs the original URL as requested by the client
   */
  public constructor(originalUrlExtractor: TargetExtractor) {
    super();
    this.originalUrlExtractor = originalUrlExtractor;
  }

  public async canHandle({ headers }: HttpRequest): Promise<void> {
    const { authorization } = headers;
    if (!authorization || !authorization.startsWith('DPoP ')) {
      throw new NotImplementedHttpError('No DPoP-bound Authorization header specified.');
    }
  }

  public async handle(request: HttpRequest): Promise<Credentials> {
    const { headers: { authorization, dpop }, method } = request;
    if (!dpop) {
      throw new BadRequestHttpError('No DPoP header specified.');
    }

    // Reconstruct the original URL as requested by the client,
    // since this is the one it used to authorize the request
    const originalUrl = await this.originalUrlExtractor.handleSafe({ request });

    // Validate the Authorization and DPoP header headers
    // and extract the WebID provided by the client
    try {
      const { webid: webId } = await this.verify(
        authorization!,
        {
          header: dpop as string,
          method: method as RequestMethod,
          url: originalUrl.path,
        },
      );
      this.logger.info(`Verified WebID via DPoP-bound access token: ${webId}`);
      return { webId };
    } catch (error: unknown) {
      const message = `Error verifying WebID via DPoP-bound access token: ${(error as Error).message}`;
      this.logger.warn(message);
      throw new BadRequestHttpError(message);
    }
  }
}
