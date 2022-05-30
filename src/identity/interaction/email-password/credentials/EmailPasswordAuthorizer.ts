import assert from 'assert';
import type { Representation } from '../../../../http/representation/Representation';
import { MethodNotAllowedHttpError } from '../../../../util/errors/MethodNotAllowedHttpError';
import { readJsonStream } from '../../../../util/StreamUtil';
import type { InteractionHandlerInput } from '../../InteractionHandler';
import { InteractionHandler } from '../../InteractionHandler';
import type { AccountStore } from '../storage/AccountStore';
import type { CredentialsHandler } from './CredentialsHandler';

/**
 * Authenticates a user by the email/password in a JSON POST body.
 * Passes the body and the WebID associated with that account to the source handler.
 */
export class EmailPasswordAuthorizer extends InteractionHandler {
  private readonly accountStore: AccountStore;
  private readonly source: CredentialsHandler;

  public constructor(accountStore: AccountStore, source: CredentialsHandler) {
    super();
    this.accountStore = accountStore;
    this.source = source;
  }

  public async handle({ operation }: InteractionHandlerInput): Promise<Representation> {
    if (operation.method !== 'POST') {
      throw new MethodNotAllowedHttpError([ operation.method ], 'Only POST requests are supported.');
    }
    const json = await readJsonStream(operation.body.data);
    const { email, password } = json;
    assert(typeof email === 'string' && email.length > 0, 'Email required');
    assert(typeof password === 'string' && password.length > 0, 'Password required');
    const webId = await this.accountStore.authenticate(email, password);
    // Password no longer needed from this point on
    delete json.password;
    return this.source.handleSafe({ operation, body: { ...json, email, webId }});
  }
}
