import type { StringSchema } from 'yup';
import { object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { assertAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import type { WebIdLinkRoute } from '../webid/WebIdLinkRoute';
import { parseSchema, URL_SCHEMA, validateWithError } from '../YupUtil';
import type { PodIdRoute } from './PodIdRoute';
import type { PodCreator } from './util/PodCreator';
import type { PodStore } from './util/PodStore';

const inSchema = object({
  name: string().trim().min(1).optional(),
  settings: object({
    webId: URL_SCHEMA,
  }).optional(),
});

type OutType = {
  pod: string;
  podResource: string;
  webId: string;
  webIdResource?: string;
};

/**
 * Handles the creation of pods.
 * Will call the stored {@link PodCreator} with the settings found in the input JSON.
 */
export class CreatePodHandler extends JsonInteractionHandler<OutType> implements JsonView {
  private readonly logger = getLoggerFor(this);

  private readonly podStore: PodStore;
  private readonly podCreator: PodCreator;
  private readonly webIdLinkRoute: WebIdLinkRoute;
  private readonly podIdRoute: PodIdRoute;

  private readonly inSchema: typeof inSchema;

  public constructor(
    podStore: PodStore,
    podCreator: PodCreator,
    webIdLinkRoute: WebIdLinkRoute,
    podIdRoute: PodIdRoute,
    allowRoot = false,
  ) {
    super();
    this.podStore = podStore;
    this.podCreator = podCreator;
    this.webIdLinkRoute = webIdLinkRoute;
    this.podIdRoute = podIdRoute;

    this.inSchema = inSchema.clone();

    if (!allowRoot) {
      // Casting is necessary to prevent errors
      this.inSchema.fields.name = (this.inSchema.fields.name as StringSchema).required();
    }
  }

  public async getView({ accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    assertAccountId(accountId);
    const pods: Record<string, string> = {};
    for (const { id, baseUrl } of await this.podStore.findPods(accountId)) {
      pods[baseUrl] = this.podIdRoute.getPath({ accountId, podId: id });
    }
    return { json: { ...parseSchema(this.inSchema), pods }};
  }

  public async handle({ json, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    // In case the class was not initialized with allowRoot: false, missing name values will result in an error
    const { name, settings } = await validateWithError(inSchema, json);
    assertAccountId(accountId);

    const result = await this.podCreator.handleSafe({
      accountId,
      webId: settings?.webId,
      name,
      settings,
    });

    const webIdResource = result.webIdLink && this.webIdLinkRoute.getPath({ accountId, webIdLink: result.webIdLink });
    const podResource = this.podIdRoute.getPath({ accountId, podId: result.podId });

    return { json: { pod: result.podUrl, webId: result.webId, podResource, webIdResource }};
  }
}
