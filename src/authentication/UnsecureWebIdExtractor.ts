import { getLoggerFor } from '../logging/LogUtil';
import type { HttpRequest } from '../server/HttpRequest';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { CredentialGroup } from './Credentials';
import type { CredentialSet } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';

/**
 * Credentials extractor which simply interprets the contents of the Authorization header as a WebID.
 */
export class UnsecureWebIdExtractor extends CredentialsExtractor {
  protected readonly logger = getLoggerFor(this);

  public async canHandle({ headers }: HttpRequest): Promise<void> {
    const { authorization } = headers;
    if (!authorization || !/^WebID /ui.test(authorization)) {
      throw new NotImplementedHttpError('No WebID Authorization header specified.');
    }
  }

  public async handle({ headers }: HttpRequest): Promise<CredentialSet> {
    const webId = /^WebID\s+(.*)/ui.exec(headers.authorization!)![1];
    this.logger.info(`Agent unsecurely claims to be ${webId}`);
    return { [CredentialGroup.agent]: { webId }};
  }
}
