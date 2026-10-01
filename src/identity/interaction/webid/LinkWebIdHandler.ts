import { object } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { ensureTrailingSlash } from '../../../util/PathUtil';
import type { OwnershipValidator } from '../../ownership/OwnershipValidator';
import { assertAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import type { PodStore } from '../pod/util/PodStore';
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
   * Pod store to find out if the account created the pod containing the WebID.
   */
  podStore: PodStore;
  /**
   * WebID store to store WebID links.
   */
  webIdStore: WebIdStore;
  /**
   * Route used to generate the WebID link resource URL.
   */
  webIdRoute: WebIdLinkRoute;
}

/**
 * Handles the linking of WebIDs to account,
 * thereby registering them to the server IDP.
 */
export class LinkWebIdHandler extends JsonInteractionHandler<OutType> implements JsonView {
  private readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly ownershipValidator: OwnershipValidator;
  private readonly podStore: PodStore;
  private readonly webIdStore: WebIdStore;
  private readonly webIdRoute: WebIdLinkRoute;

  public constructor(args: LinkWebIdHandlerArgs) {
    super();
    this.baseUrl = args.baseUrl;
    this.ownershipValidator = args.ownershipValidator;
    this.podStore = args.podStore;
    this.webIdStore = args.webIdStore;
    this.webIdRoute = args.webIdRoute;
  }

  public async getView({ accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    assertAccountId(accountId);
    const webIdLinks: Record<string, string> = {};
    for (const { id, webId } of await this.webIdStore.findLinks(accountId)) {
      webIdLinks[webId] = this.webIdRoute.getPath({ accountId, webIdLink: id });
    }
    return { json: { ...parseSchema(inSchema), webIdLinks }};
  }

  public async handle({ accountId, json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    assertAccountId(accountId);

    const { webId } = await validateWithError(inSchema, json);

    if (await this.webIdStore.isLinked(webId, accountId)) {
      this.logger.warn(`Trying to link WebID ${webId} to account ${accountId} which already has this link`);
      throw new BadRequestHttpError(`${webId} is already registered to this account.`);
    }

    // Only need to check ownership if the account did not create the pod the WebID is in.
    // The pod list is the source of truth: the storage location lookup can resolve every
    // identifier to the server root (RootStorageLocationStrategy), which matches no pod.
    const documentUrl = webId.replace(/#.*/u, '');
    const isCreator = (await this.podStore.findPods(accountId)).some(({ baseUrl: podUrl }): boolean =>
      ensureTrailingSlash(documentUrl).startsWith(ensureTrailingSlash(podUrl)));

    if (!isCreator) {
      await this.ownershipValidator.handleSafe({ webId });
    }

    const webIdLink = await this.webIdStore.create(webId, accountId);
    const resource = this.webIdRoute.getPath({ accountId, webIdLink });

    return { json: { resource, webId, oidcIssuer: this.baseUrl }};
  }
}
