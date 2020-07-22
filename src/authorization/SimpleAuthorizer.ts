import { UnsupportedHttpError } from '../util/errors/UnsupportedHttpError';
import { Authorizer, AuthorizerArgs } from './Authorizer';

/**
 * Authorizer which allows all access independent of the identifier and requested permissions.
 */
export class SimpleAuthorizer extends Authorizer {
  public async canHandle(input: AuthorizerArgs): Promise<void> {
    if (!input.identifier || !input.permissions) {
      throw new UnsupportedHttpError('Authorizer requires an identifier and permissions.');
    }
  }

  public async handle(): Promise<void> {
    // Allows all actions
  }
}
