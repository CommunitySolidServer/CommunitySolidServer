import type { HttpRequest } from '../server/HttpRequest';
import type { Credentials } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';

/**
 * Credentials extractor which simply interprets the contents of the Authorization header as a webID.
 */
export class UnsecureWebIdExtractor extends CredentialsExtractor {
  public async canHandle(): Promise<void> {
    // Supports all requests
  }

  public async handle(input: HttpRequest): Promise<Credentials> {
    return { webID: input.headers.authorization };
  }
}
