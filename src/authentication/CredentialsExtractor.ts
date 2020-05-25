import { Credentials } from './Credentials';
import { HttpRequest } from '../server/HttpRequest';

/**
 * Responsible for extracting credentials.
 */
export interface CredentialsExtractor {
  /**
   * Extracts the credentials found in an HttpRequest.
   *
   * @param request - The incoming request.
   * @returns A promise resolving to the credentials.
   */
  extractCredentials: (request: HttpRequest) => Promise<Credentials>;
}
