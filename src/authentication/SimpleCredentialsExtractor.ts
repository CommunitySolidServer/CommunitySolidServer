import { Credentials } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';
import { HttpRequest } from '../server/HttpRequest';

/**
 * Credentials extractor which simply interprets the contents of the Authorization header as a webID.
 */
export class SimpleCredentialsExtractor extends CredentialsExtractor {
  public async canHandle(): Promise<void> {
    // Supports all requests
  }

  public async handle(input: HttpRequest): Promise<Credentials> {
    if (input.headers.authorization) {
      return { webID: input.headers.authorization };
    }
  }
}
