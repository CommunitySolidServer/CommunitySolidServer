import { getLoggerFor } from '../logging/LogUtil';
import { CredentialGroup } from './Credentials';
import type { Credential, CredentialSet } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';

/**
 * Credentials extractor that authenticates a constant agent
 * (useful for development or debugging purposes).
 */
export class UnsecureConstantCredentialsExtractor extends CredentialsExtractor {
  private readonly credentials: CredentialSet;
  private readonly logger = getLoggerFor(this);

  public constructor(agent: string);
  public constructor(agent: Credential);
  public constructor(agent: string | Credential) {
    super();
    this.credentials = { [CredentialGroup.agent]: typeof agent === 'string' ? { webId: agent } : agent };
  }

  public async handle(): Promise<CredentialSet> {
    this.logger.info(`Agent unsecurely claims to be ${this.credentials.agent!.webId}`);
    return this.credentials;
  }
}
