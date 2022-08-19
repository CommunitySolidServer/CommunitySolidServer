import { getLoggerFor } from '../logging/LogUtil';
import type { Credentials } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';

/**
 * Credentials extractor that authenticates a constant agent
 * (useful for development or debugging purposes).
 */
export class UnsecureConstantCredentialsExtractor extends CredentialsExtractor {
  private readonly credentials: Credentials;
  private readonly logger = getLoggerFor(this);

  public constructor(agent: string);
  public constructor(agent: Credentials['agent']);
  public constructor(agent: string | Credentials['agent']) {
    super();
    this.credentials = { agent: typeof agent === 'string' ? { webId: agent } : agent };
  }

  public async handle(): Promise<Credentials> {
    this.logger.info(`Agent unsecurely claims to be ${this.credentials.agent!.webId}`);
    return this.credentials;
  }
}
