import { AsyncHandler } from '../util/AsyncHandler';
import { Credentials } from './Credentials';
import { HttpRequest } from '../server/HttpRequest';

/**
 * Responsible for extracting credentials from an incoming request.
 * Will return `null` if no credentials were found.
 */
export type CredentialsExtractor = AsyncHandler<HttpRequest, Credentials>;
