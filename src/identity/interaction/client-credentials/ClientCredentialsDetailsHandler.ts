import { getLoggerFor } from '../../../logging/LogUtil';
import { InternalServerError } from '../../../util/errors/InternalServerError';
import type { AccountStore } from '../account/util/AccountStore';
import { ensureResource, getRequiredAccount } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { ClientCredentialsStore } from './util/ClientCredentialsStore';

type OutType = {
  id: string;
  webId: string;
};

/**
 * Provides a view on a client credentials token, indicating the token identifier and its associated WebID.
 */
export class ClientCredentialsDetailsHandler extends JsonInteractionHandler<OutType> {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly clientCredentialsStore: ClientCredentialsStore;

  public constructor(accountStore: AccountStore, clientCredentialsStore: ClientCredentialsStore) {
    super();
    this.accountStore = accountStore;
    this.clientCredentialsStore = clientCredentialsStore;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    const account = await getRequiredAccount(this.accountStore, accountId);

    const id = ensureResource(account.clientCredentials, target.path);

    const credentials = await this.clientCredentialsStore.get(id);
    if (!credentials) {
      this.logger.error(
        `Data inconsistency between account and credentials data for account ${account.id} and token ${id}.`,
      );
      throw new InternalServerError('Data inconsistency between account and client credentials data.');
    }

    return { json: {
      id,
      webId: credentials.webId,
    }};
  }
}
