import { verify } from 'ts-dpop';
import type { TargetExtractor } from '../ldp/http/TargetExtractor';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpRequest } from '../server/HttpRequest';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Credentials } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';

/**
 * Credentials extractor which extracts a WebID from a DPoP token.
 */
export class DPoPWebIdExtractor extends CredentialsExtractor {
  protected readonly logger = getLoggerFor(this);
  private readonly targetExtractor: TargetExtractor;

  public constructor(targetExtractor: TargetExtractor) {
    super();
    this.targetExtractor = targetExtractor;
  }

  public async canHandle({ headers }: HttpRequest): Promise<void> {
    const { authorization } = headers;
    if (!authorization || !authorization.startsWith('DPoP ')) {
      throw new NotImplementedHttpError('No DPoP Authorization header specified.');
    }
  }

  public async handle(request: HttpRequest): Promise<Credentials> {
    const { headers: { authorization, dpop }, method } = request;
    if (!dpop) {
      throw new BadRequestHttpError('No DPoP token specified.');
    }
    const resource = await this.targetExtractor.handleSafe(request);
    try {
      const webId = await verify(authorization as string, dpop as string, method as any, resource.path);
      this.logger.info(`Verified WebID via DPoP token: ${webId}`);
      return { webId };
    } catch (error: unknown) {
      const message = `Error verifying WebID via DPoP token: ${(error as Error).message}`;
      this.logger.warn(message);
      throw new BadRequestHttpError(message);
    }
  }
}
