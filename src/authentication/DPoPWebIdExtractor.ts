import { verify } from 'ts-dpop';
import type { TargetExtractor } from '../ldp/http/TargetExtractor';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpRequest } from '../server/HttpRequest';
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

  public async handle(request: HttpRequest): Promise<Credentials> {
    let webID: string | undefined;
    const authorizationHeader = request.headers.authorization;
    const dpopHeader = request.headers.dpop as string;
    if (authorizationHeader && dpopHeader) {
      const method = request.method as any;
      const resource = await this.targetExtractor.handleSafe(request);
      try {
        webID = await verify(authorizationHeader, dpopHeader, method, resource.path);
        this.logger.info(`Extracted WebID via DPoP token: ${webID}`);
      } catch (error: unknown) {
        this.logger.warn(`Error verifying WebID via DPoP token: ${(error as Error).message}`);
      }
    }
    return { webID };
  }
}
