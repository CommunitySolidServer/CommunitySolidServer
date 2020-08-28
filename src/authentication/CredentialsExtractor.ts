import { HttpRequest } from '../server/HttpRequest';
import { AsyncHandler } from '../util/AsyncHandler';
import { Credentials } from './Credentials';

/**
 * Responsible for extracting credentials from an incoming request.
 * Will return `null` if no credentials were found.
 */
export abstract class CredentialsExtractor extends AsyncHandler<HttpRequest, Credentials> {}
