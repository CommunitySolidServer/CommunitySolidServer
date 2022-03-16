import type { InteractionResults } from 'oidc-provider';
import { boolean, object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../../util/errors/FoundHttpError';
import type { ProviderFactory } from '../../configuration/ProviderFactory';
import type { AccountStore } from '../account/util/AccountStore';
import { getRequiredAccount } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { assertOidcInteraction, finishInteraction, forgetWebId } from '../InteractionUtil';
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
 *
 * One of the main reason picking a WebID is a separate class/request from consenting to the OIDC interaction,
 * is because the OIDC-provider will only give the information we need for consent
 * once we have added an accountId to the OIDC interaction, which we do in this class.
 * The library also really wants to use that accountId as the value that you use for generating the tokens,
 * meaning we can't just use another value there, so we need to assign the WebID to it,
 * unless we use a hacky workaround.
 */
export class PickWebIdHandler extends JsonInteractionHandler<never> implements JsonView {
  private readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly providerFactory: ProviderFactory;

  public constructor(accountStore: AccountStore, providerFactory: ProviderFactory) {
    super();
    this.accountStore = accountStore;
    this.providerFactory = providerFactory;
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
      this.logger.warn(`Trying to pick WebID ${webId} which does not belong to account ${accountId}`);
      throw new BadRequestHttpError('WebID does not belong to this account.');
    }

    // We need to explicitly forget the WebID from the session or the library won't allow us to update the value
    await forgetWebId(await this.providerFactory.getProvider(), oidcInteraction);

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
