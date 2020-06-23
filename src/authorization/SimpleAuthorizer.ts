import { UnsupportedHttpError } from '../util/errors/UnsupportedHttpError';
import { Authorizer, AuthorizerArgs } from './Authorizer';

export class SimpleAuthorizer extends Authorizer {
  public async canHandle(input: AuthorizerArgs): Promise<void> {
    if (!input.identifier || !input.permissions) {
      throw new UnsupportedHttpError('Authorizer requires an identifier and permissions.');
    }
  }

  public async handle(): Promise<void> {
    return undefined;
  }
}
