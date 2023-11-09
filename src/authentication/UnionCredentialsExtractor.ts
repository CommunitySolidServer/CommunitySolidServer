import { UnionHandler } from '../util/handlers/UnionHandler';
import type { Credentials } from './Credentials';
import type { CredentialsExtractor } from './CredentialsExtractor';

/**
 * Combines the results of several CredentialsExtractors into one.
 * If multiple of these extractors return a value for the same key,
 * the last result will be used.
 */
export class UnionCredentialsExtractor extends UnionHandler<CredentialsExtractor> {
  public constructor(extractors: CredentialsExtractor[]) {
    super(extractors);
  }

  public async combine(results: Credentials[]): Promise<Credentials> {
    // Combine all the results into a single object
    const credentials: Credentials = {};
    for (const result of results) {
      for (const key of Object.keys(result) as (keyof Credentials)[]) {
        this.setValue(credentials, key, result[key]);
      }
    }
    return credentials;
  }

  /**
   * Helper function that makes sure the typings are correct.
   */
  private setValue<T extends keyof Credentials>(credentials: Credentials, key: T, value?: Credentials[T]): void {
    if (value) {
      credentials[key] = value;
    }
  }
}
