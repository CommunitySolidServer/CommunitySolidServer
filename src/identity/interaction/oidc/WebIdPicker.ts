import type { InteractionResults } from 'oidc-provider';
import { boolean, object, string } from 'yup';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../../util/errors/FoundHttpError';
import type { AccountStore } from '../account/util/AccountStore';
import { getRequiredAccount } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { assertOidcInteraction, finishInteraction } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, validateWithError } from '../YupUtil';

const inSchema = object({
  webId: string().trim().required(),
  remember: boolean().default(false),
});

/**
 * Allows users to choose which WebID they want to authenticate as during an OIDC interaction.
 */
export class WebIdPicker extends JsonInteractionHandler<never> implements JsonView {
  private readonly accountStore: AccountStore;

  public constructor(accountStore: AccountStore) {
    super();
    this.accountStore = accountStore;
  }

  public async getView({ accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    const account = await getRequiredAccount(this.accountStore, accountId);
    const description = parseSchema(inSchema);
    return { json: { ...description, webIds: Object.keys(account.webIds) }};
  }

  public async handle({ oidcInteraction, accountId, json }: JsonInteractionHandlerInput): Promise<never> {
    assertOidcInteraction(oidcInteraction);
    const account = await getRequiredAccount(this.accountStore, accountId);

    const { webId, remember } = await validateWithError(inSchema, json);
    if (!account.webIds[webId]) {
      throw new BadRequestHttpError('WebID does not belong to this account.');
    }

    // Update the interaction to get the redirect URL
    const login: InteractionResults['login'] = {
      // Note that `accountId` here is unrelated to our user accounts but is part of the OIDC library
      accountId: webId,
      remember,
    };

    const location = await finishInteraction(oidcInteraction, { login }, true);
    throw new FoundHttpError(location);
  }
}
