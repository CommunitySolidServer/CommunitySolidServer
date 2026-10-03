import { boolean, object } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { PodSettings } from '../../../pods/settings/PodSettings';
import type { Resource, ResourcesGenerator } from '../../../pods/generate/ResourcesGenerator';
import type { ResourceStore } from '../../../storage/ResourceStore';
import { APPLICATION_LD_JSON, TEXT_N3, TEXT_TURTLE } from '../../../util/ContentTypes';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../util/errors/InternalServerError';
import { ensureTrailingSlash, isContainerIdentifier } from '../../../util/PathUtil';
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
  confirm: boolean().required(),
});

type OutType = {
  webId: string;
  cardUrl: string;
  link: string;
  oidcIssuer: string;
  /**
   * URL of the backup of the previous card, if there was one.
   */
  backupUrl?: string;
  /**
   * Set when the pod templates did not provide an authorization file for the recovered document.
   */
  note?: string;
};

export interface RecoverWebIdHandlerArgs {
  /**
   * Base URL of the server, used as the `solid:oidcIssuer` of the recovered WebID.
   */
  baseUrl: string;
  /**
   * Pod store, used to verify that the recovered WebID is hosted in a pod of the account.
   */
  podStore: PodStore;
  /**
   * WebID store, used to find the link of the recovered WebID.
   */
  webIdStore: WebIdStore;
  /**
   * Route used to generate the WebID link resource URL.
   */
  webIdRoute: WebIdLinkRoute;
  /**
   * Generator that produces the pod resources.
   * Its output for the recovered WebID is written as-is: the templates are the source of truth.
   */
  resourcesGenerator: ResourcesGenerator;
  /**
   * Store used to write the generated resources and the backup.
   */
  store: ResourceStore;
}

/**
 * Recovers the profile card of a WebID that is hosted in a pod of the requesting account.
 *
 * Unlike {@link LinkWebIdHandler}, this does not need the registration-token flow or a readable profile:
 * the account session proves the ownership of the account and the pod store proves that the WebID is
 * hosted in one of its pods. The resources that pod generation produces for the recovered WebID are then
 * written server-side as they are: the templates are the source of truth. The previous profile document
 * is backed up first. The recovered WebID is the existing link, fragment included.
 */
export class RecoverWebIdHandler extends JsonInteractionHandler<OutType> implements JsonView {
  private readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly podStore: PodStore;
  private readonly webIdStore: WebIdStore;
  private readonly webIdRoute: WebIdLinkRoute;
  private readonly resourcesGenerator: ResourcesGenerator;
  private readonly store: ResourceStore;

  public constructor(args: RecoverWebIdHandlerArgs) {
    super();
    this.baseUrl = args.baseUrl;
    this.podStore = args.podStore;
    this.webIdStore = args.webIdStore;
    this.webIdRoute = args.webIdRoute;
    this.resourcesGenerator = args.resourcesGenerator;
    this.store = args.store;
  }

  public async getView({ accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    assertAccountId(accountId);
    const pods = (await this.podStore.findPods(accountId))
      .map(({ baseUrl }): string => ensureTrailingSlash(baseUrl));
    const webIds = (await this.webIdStore.findLinks(accountId))
      .map(({ webId }): string => webId)
      .filter((webId): boolean => this.findPod(this.getDocument(webId), pods) !== undefined);
    return { json: { ...parseSchema(inSchema), webIds, pods }};
  }

  public async handle({ accountId, json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    assertAccountId(accountId);

    const { webId, confirm } = await validateWithError(inSchema, json);

    const link = (await this.webIdStore.findLinks(accountId))
      .find((entry): boolean => entry.webId === webId);
    if (!link) {
      throw new BadRequestHttpError(`${webId} is not linked to this account.`);
    }

    const cardUrl = this.getDocument(webId);
    const podUrl = this.findPod(cardUrl, (await this.podStore.findPods(accountId))
      .map(({ baseUrl }): string => ensureTrailingSlash(baseUrl)));
    if (!podUrl) {
      throw new BadRequestHttpError(`${webId} is not hosted in a pod of this account.`);
    }

    if (!confirm) {
      const backup = await this.store.hasResource({ path: cardUrl }) ?
        ' and to back up the current profile document first' :
        '';
      throw new BadRequestHttpError(
        `Set "confirm": true to replace ${cardUrl} and its authorization file${backup}.`,
      );
    }

    // The templates decide what can be recovered: generate everything first,
    // so nothing is written or backed up before we know the profile document will be produced.
    const resources = await this.generateResources(podUrl, webId, cardUrl);
    const card = resources.find(({ identifier }): boolean => identifier.path === cardUrl);
    if (!card) {
      throw new BadRequestHttpError(
        `The pod templates do not generate ${cardUrl}; this WebID cannot be recovered on this server.`,
      );
    }

    const backupUrl = await this.backupCard(cardUrl);
    for (const { identifier, representation } of resources) {
      await this.store.setRepresentation(identifier, representation);
    }

    const result: OutType = {
      webId,
      cardUrl,
      link: this.webIdRoute.getPath({ accountId, webIdLink: link.id }),
      oidcIssuer: this.baseUrl,
    };
    if (backupUrl) {
      result.backupUrl = backupUrl;
    }
    if (!resources.some(({ identifier }): boolean => identifier.path !== cardUrl)) {
      this.logger.warn(
        `No authorization file was generated for ${cardUrl}; its authorization is left unchanged.`,
      );
      result.note = 'No authorization file was generated for this profile document; ' +
        'its authorization was left unchanged.';
    }
    return { json: result };
  }

  /**
   * The document of a WebID, in other words the WebID without its fragment.
   */
  protected getDocument(webId: string): string {
    return webId.replace(/#.*/u, '');
  }

  /**
   * Copies the current card to a unique backup resource, exactly as it is stored.
   * The backup must not depend on the content being readable or parseable:
   * a broken card is the case it exists for.
   * It is a normal resource of the pod, so the pod's authorization applies to it.
   * Returns `null` if there is no card to back up.
   */
  protected async backupCard(cardUrl: string): Promise<string | null> {
    if (!await this.store.hasResource({ path: cardUrl })) {
      return null;
    }

    const representation = await this.store.getRepresentation({ path: cardUrl }, {});
    const extension = this.getBackupExtension(representation.metadata.contentType);
    const backupUrl = await this.getBackupUrl(cardUrl, extension);
    await this.store.setRepresentation({ path: backupUrl }, representation);

    return backupUrl;
  }

  /**
   * File extension of a backup, based on the stored content type of the card.
   */
  protected getBackupExtension(contentType?: string): string {
    if (contentType === TEXT_TURTLE) {
      return '.ttl';
    }
    if (contentType === APPLICATION_LD_JSON) {
      return '.jsonld';
    }
    if (contentType === TEXT_N3) {
      return '.n3';
    }
    return '.bin';
  }

  /**
   * Finds a free backup URL for the given card: `<card>.backup-<timestamp><extension>`, with a numeric
   * suffix only if the name is already taken. An existing backup is never overwritten.
   */
  protected async getBackupUrl(cardUrl: string, extension: string): Promise<string> {
    const stamp = new Date().toISOString().replaceAll(/[:.]/gu, '-');
    for (let i = 1; i < 100; i += 1) {
      const suffix = i === 1 ? '' : `-${i}`;
      const backupUrl = `${cardUrl}.backup-${stamp}${suffix}${extension}`;
      if (!await this.store.hasResource({ path: backupUrl })) {
        return backupUrl;
      }
    }
    throw new InternalServerError(`Unable to create a unique backup name for ${cardUrl}.`);
  }

  /**
   * Finds the pod base URL that hosts the given document, if there is one.
   */
  protected findPod(documentUrl: string, podUrls: string[]): string | undefined {
    return podUrls.find((podUrl): boolean => documentUrl.startsWith(podUrl));
  }

  /**
   * Generates the pod resources for the given WebID and keeps the ones that belong to the recovered
   * document: the profile document itself and any resource generated next to it, such as `<document>.acl`
   * for WAC or `<document>.acr` for ACP deployments.
   */
  protected async generateResources(podUrl: string, webId: string, documentUrl: string): Promise<Resource[]> {
    const settings: PodSettings = { base: { path: podUrl }, webId, oidcIssuer: this.baseUrl };
    const resources: Resource[] = [];
    for await (const { identifier, representation } of this.resourcesGenerator.generate(settings.base, settings)) {
      if (isContainerIdentifier(identifier)) {
        continue;
      }
      if (identifier.path === documentUrl || identifier.path.startsWith(`${documentUrl}.`)) {
        resources.push({ identifier, representation });
      }
    }
    return resources;
  }
}
