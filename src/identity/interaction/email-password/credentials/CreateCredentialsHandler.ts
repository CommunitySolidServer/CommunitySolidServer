import { randomBytes } from 'crypto';
import { v4 } from 'uuid';
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
 * Handles the creation of credential tokens.
 * Requires a `name` field in the input JSON body,
 * that will be used to generate the ID token.
 */
export class CreateCredentialsHandler extends CredentialsHandler {
  private readonly accountStore: AccountStore;
  private readonly credentialStorage: KeyValueStorage<string, ClientCredentials>;

  public constructor(accountStore: AccountStore, credentialStorage: KeyValueStorage<string, ClientCredentials>) {
    super();
    this.accountStore = accountStore;
    this.credentialStorage = credentialStorage;
  }

  public async canHandle({ body }: CredentialsHandlerInput): Promise<void> {
    if (typeof body.name !== 'string') {
      throw new NotImplementedHttpError();
    }
  }

  public async handle({ operation, body: { webId, name }}: CredentialsHandlerInput): Promise<Representation> {
    const settings = await this.accountStore.getSettings(webId);

    if (!settings.useIdp) {
      throw new BadRequestHttpError('This server is not an identity provider for this account.');
    }

    const id = `${(name as string).replace(/\W/gu, '-')}_${v4()}`;
    const secret = randomBytes(64).toString('hex');

    // Store the credentials, and point to them from the account
    settings.clientCredentials = settings.clientCredentials ?? [];
    settings.clientCredentials.push(id);
    await this.accountStore.updateSettings(webId, settings);
    await this.credentialStorage.set(id, { secret, webId });

    const response = { id, secret };
    return new BasicRepresentation(JSON.stringify(response), operation.target, APPLICATION_JSON);
  }
}
