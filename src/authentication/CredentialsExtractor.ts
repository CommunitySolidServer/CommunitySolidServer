import type { HttpRequest } from '../server/HttpRequest';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import type { Credentials } from './Credentials';

/**
 * Responsible for extracting credentials from an incoming request.
 */
export abstract class CredentialsExtractor<TCredentials extends Record<string, unknown> = Credentials>
  extends AsyncHandler<HttpRequest, TCredentials> {}
