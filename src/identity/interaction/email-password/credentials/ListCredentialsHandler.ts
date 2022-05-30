import { BasicRepresentation } from '../../../../http/representation/BasicRepresentation';
import type { Representation } from '../../../../http/representation/Representation';
import { APPLICATION_JSON } from '../../../../util/ContentTypes';
import type { AccountStore } from '../storage/AccountStore';
import type { CredentialsHandlerInput } from './CredentialsHandler';
import { CredentialsHandler } from './CredentialsHandler';

/**
 * Returns a list of all credential tokens associated with this account.
 * Note that this only returns the ID tokens, not the associated secrets.
 */
export class ListCredentialsHandler extends CredentialsHandler {
  private readonly accountStore: AccountStore;

  public constructor(accountStore: AccountStore) {
    super();
    this.accountStore = accountStore;
  }

  public async handle({ operation, body: { webId }}: CredentialsHandlerInput): Promise<Representation> {
    const credentials = (await this.accountStore.getSettings(webId)).clientCredentials ?? [];
    return new BasicRepresentation(JSON.stringify(credentials), operation.target, APPLICATION_JSON);
  }
}
