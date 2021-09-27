import { CredentialGroup } from './Credentials';
import type { CredentialSet } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';

/**
 * Extracts the public credentials, to be used for data everyone has access to.
 */
export class PublicCredentialsExtractor extends CredentialsExtractor {
  public async handle(): Promise<CredentialSet> {
    return { [CredentialGroup.public]: {}};
  }
}
