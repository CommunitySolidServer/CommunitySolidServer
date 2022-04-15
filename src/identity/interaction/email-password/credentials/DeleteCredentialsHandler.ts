import { BasicRepresentation } from '../../../../http/representation/BasicRepresentation';
import type { Representation } from '../../../../http/representation/Representation';
import type { KeyValueStorage } from '../../../../storage/keyvalue/KeyValueStorage';
import { APPLICATION_JSON } from '../../../../util/ContentTypes';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../util/errors/NotImplementedHttpError';
import type { AccountStore } from '../storage/AccountStore';
import type { ClientCredentials } from './ClientCredentialsAdapterFactory';
import type { CredentialsHandlerInput } from './CredentialsHandler';
import { CredentialsHandler } from './CredentialsHandler';

/**
 * Handles the deletion of credential tokens.
 * Expects the JSON body to have a `delete` field with as value the ID of the token to be deleted.
 * This should be replaced to be an actual DELETE request once the API supports it.
 */
export class DeleteCredentialsHandler extends CredentialsHandler {
  private readonly accountStore: AccountStore;
  private readonly credentialStorage: KeyValueStorage<string, ClientCredentials>;

  public constructor(accountStore: AccountStore, credentialStorage: KeyValueStorage<string, ClientCredentials>) {
    super();
    this.accountStore = accountStore;
    this.credentialStorage = credentialStorage;
  }

  public async canHandle({ body }: CredentialsHandlerInput): Promise<void> {
    if (typeof body.delete !== 'string') {
      throw new NotImplementedHttpError();
    }
  }

  public async handle({ operation, body }: CredentialsHandlerInput): Promise<Representation> {
    const id = body.delete as string;
    const settings = await this.accountStore.getSettings(body.webId);
    settings.clientCredentials = settings.clientCredentials ?? [];
    const idx = settings.clientCredentials.indexOf(id);
    if (idx < 0) {
      throw new BadRequestHttpError('No credential with this ID exists for this account.');
    }

    await this.credentialStorage.delete(id);
    settings.clientCredentials.splice(idx, 1);
    await this.accountStore.updateSettings(body.webId, settings);
    return new BasicRepresentation(JSON.stringify({}), operation.target, APPLICATION_JSON);
  }
}
