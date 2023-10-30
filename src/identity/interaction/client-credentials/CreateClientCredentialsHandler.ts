import { v4 } from 'uuid';
import { object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { sanitizeUrlPart } from '../../../util/StringUtil';
import { assertAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import type { WebIdStore } from '../webid/util/WebIdStore';
import { parseSchema, validateWithError } from '../YupUtil';
import type { ClientCredentialsIdRoute } from './util/ClientCredentialsIdRoute';
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
  protected readonly logger = getLoggerFor(this);

  private readonly webIdStore: WebIdStore;
  private readonly clientCredentialsStore: ClientCredentialsStore;
  private readonly clientCredentialsRoute: ClientCredentialsIdRoute;

  public constructor(
    webIdStore: WebIdStore,
    clientCredentialsStore: ClientCredentialsStore,
    clientCredentialsRoute: ClientCredentialsIdRoute,
  ) {
    super();
    this.webIdStore = webIdStore;
    this.clientCredentialsStore = clientCredentialsStore;
    this.clientCredentialsRoute = clientCredentialsRoute;
  }

  public async getView({ accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    assertAccountId(accountId);
    const clientCredentials: Record<string, string> = {};
    for (const { id, label } of await this.clientCredentialsStore.findByAccount(accountId)) {
      clientCredentials[label] = this.clientCredentialsRoute.getPath({ accountId, clientCredentialsId: id });
    }
    return { json: { ...parseSchema(inSchema), clientCredentials }};
  }

  public async handle({ accountId, json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    assertAccountId(accountId);

    const { name, webId } = await validateWithError(inSchema, json);

    if (!await this.webIdStore.isLinked(webId, accountId)) {
      this.logger.warn(`Trying to create token for ${webId} which does not belong to account ${accountId}`);
      throw new BadRequestHttpError('WebID does not belong to this account.');
    }

    const cleanedName = name ? sanitizeUrlPart(name.trim()) : '';
    const label = `${cleanedName}_${v4()}`;

    const { secret, id } = await this.clientCredentialsStore.create(label, webId, accountId);
    const resource = this.clientCredentialsRoute.getPath({ accountId, clientCredentialsId: id });

    // Exposing the field as `id` as that is how we originally defined the client credentials API
    // and is more consistent with how the field names are explained in other places
    return { json: { id: label, secret, resource }};
  }
}
