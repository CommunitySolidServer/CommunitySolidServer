import { object } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import type { IdentifierStrategy } from '../../../util/identifiers/IdentifierStrategy';
import type { OwnershipValidator } from '../../ownership/OwnershipValidator';
import type { AccountStore } from '../account/util/AccountStore';
import { getRequiredAccount } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, URL_SCHEMA, validateWithError } from '../YupUtil';
import type { WebIdStore } from './util/WebIdStore';
import type { WebIdLinkRoute } from './WebIdLinkRoute';

const inSchema = object({
  webId: URL_SCHEMA.required(),
});

type OutType = {
  resource: string;
  webId: string;
  oidcIssuer: string;
};

export interface LinkWebIdHandlerArgs {
  /**
   * Base URL of the server.
   * Used to indicate in the response what the object of the `solid:oidcIssuer` triple should be.
   */
  baseUrl: string;
  /**
   * Validates whether the user trying to link the WebID is the actual owner of that WebID.
   */
  ownershipValidator: OwnershipValidator;
  /**
   * Account store to store updated data.
   */
  accountStore: AccountStore;
  /**
   * WebID store to store WebID links.
   */
  webIdStore: WebIdStore;
  /**
   * Route used to generate the WebID link resource URL.
   */
  webIdRoute: WebIdLinkRoute;
  /**
   * Before calling the {@link OwnershipValidator}, we first check if the target WebID is in a pod owned by the user.
   */
  identifierStrategy: IdentifierStrategy;
}

/**
 * Handles the linking of WebIDs to account,
 * thereby registering them to the server IDP.
 */
export class LinkWebIdHandler extends JsonInteractionHandler<OutType> implements JsonView {
  private readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly ownershipValidator: OwnershipValidator;
  private readonly accountStore: AccountStore;
  private readonly webIdStore: WebIdStore;
  private readonly identifierStrategy: IdentifierStrategy;

  public constructor(args: LinkWebIdHandlerArgs) {
    super();
    this.baseUrl = args.baseUrl;
    this.ownershipValidator = args.ownershipValidator;
    this.accountStore = args.accountStore;
    this.webIdStore = args.webIdStore;
    this.identifierStrategy = args.identifierStrategy;
  }

  public async getView(): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

  public async handle({ accountId, json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    const account = await getRequiredAccount(this.accountStore, accountId);

    const { webId } = await validateWithError(inSchema, json);

    if (account.webIds[webId]) {
      this.logger.warn(`Trying to link WebID ${webId} to account ${accountId} which already has this link`);
      throw new BadRequestHttpError(`${webId} is already registered to this account.`);
    }

    // Only need to check ownership if the account is not the owner
    const isOwner = Object.keys(account.pods)
      .some((pod): boolean => this.identifierStrategy.contains({ path: pod }, { path: webId }, true));
    if (!isOwner) {
      await this.ownershipValidator.handleSafe({ webId });
    }
    const resource = await this.webIdStore.add(webId, account);

    return { json: { resource, webId, oidcIssuer: this.baseUrl }};
  }
}
