import { object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { assertAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import type { WebIdStore } from '../webid/util/WebIdStore';
import { parseSchema, validateWithError } from '../YupUtil';
import { ConflictHttpError } from '../../../util/errors/ConflictHttpError';
import type { JwtAssertionsIdRoute } from './util/JwtAssertionsIdRoute';
import type { JwtAssertionsStore } from './util/JwtAssertionsStore';

const inSchema = object({
  clientId: string().trim().required(),
  webId: string().trim().required(),
});

type OutType = {
  id: string;
  clientId: string;
  assertion: string;
};

/**
 * Handles the creation of JWT assertions.
 */
export class CreateJwtAssertionsHandler extends JsonInteractionHandler<OutType> implements JsonView {
  protected readonly logger = getLoggerFor(this);

  private readonly webIdStore: WebIdStore;
  private readonly jwtAssertionsStore: JwtAssertionsStore;
  private readonly jwtAssertionsRoute: JwtAssertionsIdRoute;

  public constructor(
    webIdStore: WebIdStore,
    jwtAssertionsStore: JwtAssertionsStore,
    jwtAssertionsRoute: JwtAssertionsIdRoute,
  ) {
    super();
    this.webIdStore = webIdStore;
    this.jwtAssertionsStore = jwtAssertionsStore;
    this.jwtAssertionsRoute = jwtAssertionsRoute;
  }

  public async getView({ accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    assertAccountId(accountId);
    const jwtAssertions: Record<string, string> = {};
    for (const { id, client: label } of await this.jwtAssertionsStore.findByAccount(accountId)) {
      jwtAssertions[label] = this.jwtAssertionsRoute.getPath({ accountId, jwtAssertionsId: id });
    }
    // DO NOT include the assertion!
    return { json: { ...parseSchema(inSchema), jwtAssertions }};
  }

  public async handle({ accountId, json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    assertAccountId(accountId);

    const { clientId, webId } = await validateWithError(inSchema, json);

    if (!await this.webIdStore.isLinked(webId, accountId)) {
      this.logger.warn(`Trying to create assertion for ${webId} which does not belong to account ${accountId}`);
      throw new BadRequestHttpError('WebID does not belong to this account.');
    }

    const accountAssertions = await this.jwtAssertionsStore.findByAccount(accountId);
    if (accountAssertions.find(a => a.client === clientId)) {
      throw new ConflictHttpError(`Assertion for Client ID ${clientId} already exists.`);
    }

    const { id: uuid, assertion } = await this.jwtAssertionsStore.create(clientId, webId, accountId);
    const id = this.jwtAssertionsRoute.getPath({ accountId, jwtAssertionsId: uuid });

    // Exposing the field as `id` as that is how we originally defined the client credentials API
    // and is more consistent with how the field names are explained in other places
    return { json: { id, clientId, assertion }};
  }
}
