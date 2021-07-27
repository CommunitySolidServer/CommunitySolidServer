import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import { Authorizer } from './Authorizer';

/**
 * An authorizer that rejects all requests.
 */
export class DenyAllAuthorizer extends Authorizer {
  public async handle(): Promise<never> {
    throw new ForbiddenHttpError();
  }
}
