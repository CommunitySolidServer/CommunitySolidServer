import { v4 } from 'uuid';
import { object, string } from 'yup';
import { importJWK, SignJWT } from 'jose';
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
import type { JwtAssertionsIdRoute } from './util/JwtAssertionsIdRoute';
import type { JwtAssertionsStore } from './util/JwtAssertionsStore';
import type { JwkGenerator } from '../../../identity/configuration/JwkGenerator';

const inSchema = object({
  clientId: string().trim().required(),
  webId: string().trim().required(),
});

type OutType = {
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
  private readonly jwkGenerator: JwkGenerator;

  public constructor(
    webIdStore: WebIdStore,
    jwtAssertionsStore: JwtAssertionsStore,
    jwtAssertionsRoute: JwtAssertionsIdRoute,
    jwkGenerator: JwkGenerator,
  ) {
    super();
    this.webIdStore = webIdStore;
    this.jwtAssertionsStore = jwtAssertionsStore;
    this.jwtAssertionsRoute = jwtAssertionsRoute;
    this.jwkGenerator = jwkGenerator;
  }

  public async getView({ accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    assertAccountId(accountId);
    const jwtAssertions: Record<string, string> = {};
    for (const { id, client: label } of await this.jwtAssertionsStore.findByAccount(accountId)) {
      jwtAssertions[label] = this.jwtAssertionsRoute.getPath({ accountId, jwtAssertionsId: id });
    }
    return { json: { ...parseSchema(inSchema), jwtAssertions }};
  }

  public async handle({ accountId, json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    assertAccountId(accountId);

    const { clientId, webId } = await validateWithError(inSchema, json);

    if (!await this.webIdStore.isLinked(webId, accountId)) {
      this.logger.warn(`Trying to create assertion for ${webId} which does not belong to account ${accountId}`);
      throw new BadRequestHttpError('WebID does not belong to this account.');
    }

    const privateKey = await this.jwkGenerator.getPrivateKey();

    const privateKeyObject = await importJWK(privateKey);

    // Make sure both header and proof have the same timestamp
    const time = Date.now();

    // Currently the spec does not define how the notification sender should identify.
    // The format used here has been chosen to be similar
    // to how ID tokens are described in the Solid-OIDC specification for consistency.
    const assertion = await new SignJWT({
      client: clientId,
      agent: webId,
    }).setProtectedHeader({ alg: privateKey.alg })
      .setIssuedAt(time)
      //.setExpirationTime(time + duration)
      //.setAudience('token endpoint')
      .setJti(v4())
      .sign(privateKeyObject);

    const { id } = await this.jwtAssertionsStore.create(clientId!, webId, accountId);

    // Exposing the field as `id` as that is how we originally defined the client credentials API
    // and is more consistent with how the field names are explained in other places
    return { json: { assertion }};
  }
}
