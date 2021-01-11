import type { SolidTokenVerifierFunction, RequestMethod } from 'ts-dpop';
import { createSolidTokenVerifier } from 'ts-dpop';
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
  protected readonly logger = getLoggerFor(this);
  private readonly targetExtractor: TargetExtractor;
  private readonly verify: SolidTokenVerifierFunction;

  public constructor(targetExtractor: TargetExtractor) {
    super();
    this.targetExtractor = targetExtractor;
    this.verify = createSolidTokenVerifier();
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
    const resource = await this.targetExtractor.handleSafe({ request });

    try {
      const { webid: webId } = await this.verify(
        authorization as string,
        {
          header: dpop as string,
          method: method as RequestMethod,
          url: resource.path,
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
