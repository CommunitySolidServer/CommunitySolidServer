import { v4 } from 'uuid';
import { object, string } from 'yup';
import { sanitizeUrlPart } from '../../../util/StringUtil';
import type { AccountStore } from '../account/util/AccountStore';
import { getRequiredAccount } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, validateWithError } from '../YupUtil';
import type { ClientCredentialsStore } from './util/ClientCredentialsStore';

const inSchema = object({
  name: string().trim().optional(),
  webId: string().trim().required(),
});

type OutType = {
  id: string;
  secret: string;
  resource: string;
};

/**
 * Handles the creation of client credential tokens.
 */
export class CreateClientCredentialsHandler extends JsonInteractionHandler<OutType> implements JsonView {
  private readonly accountStore: AccountStore;
  private readonly clientCredentialsStore: ClientCredentialsStore;

  public constructor(accountStore: AccountStore, clientCredentialsStore: ClientCredentialsStore) {
    super();
    this.accountStore = accountStore;
    this.clientCredentialsStore = clientCredentialsStore;
  }

  public async getView(): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

  public async handle({ accountId, json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    const account = await getRequiredAccount(this.accountStore, accountId);

    const { name, webId } = await validateWithError(inSchema, json);
    const cleanedName = name ? sanitizeUrlPart(name.trim()) : '';
    const id = `${cleanedName}_${v4()}`;

    const { secret, resource } = await this.clientCredentialsStore.add(id, webId, account);

    return { json: { id, secret, resource }};
  }
}
