import { boolean, object, string } from 'yup';
import type { ResourceIdentifier } from '../../../http/representation/ResourceIdentifier';
import type { EmptyObject } from '../../../util/map/MapUtil';
import { parsePath, verifyAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, validateWithError } from '../YupUtil';
import type { PodIdRoute } from './PodIdRoute';
import type { PodStore } from './util/PodStore';

const inSchema = object({
  webId: string().trim().required(),
  visible: boolean().optional().default(false),
  // If true: remove the WebID as owner
  remove: boolean().optional().default(false),
});

/**
 * Responsible for adding/updating/deleting owners in pods.
 */
export class UpdateOwnerHandler extends JsonInteractionHandler implements JsonView {
  private readonly podStore: PodStore;
  private readonly podRoute: PodIdRoute;

  public constructor(podStore: PodStore, podRoute: PodIdRoute) {
    super();
    this.podStore = podStore;
    this.podRoute = podRoute;
  }

  public async getView({ accountId, target }: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    const pod = await this.findVerifiedPod(target, accountId);
    const owners = await this.podStore.getOwners(pod.id);

    return { json: { ...parseSchema(inSchema), baseUrl: pod?.baseUrl, owners }};
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const { accountId, target, json } = input;

    const { webId, visible, remove } = await validateWithError(inSchema, json);
    const pod = await this.findVerifiedPod(target, accountId);

    if (remove) {
      await this.podStore.removeOwner(pod.id, webId);
    } else {
      await this.podStore.updateOwner(pod.id, webId, visible);
    }

    return { json: {}};
  }

  /**
   * Extract the pod ID from the path and find the associated pod.
   * Asserts that the given account ID is the creator of this pod.
   */
  protected async findVerifiedPod(target: ResourceIdentifier, accountId?: string):
  Promise<{ id: string; baseUrl: string; accountId: string }> {
    const { podId } = parsePath(this.podRoute, target.path);
    const pod = await this.podStore.get(podId);
    verifyAccountId(accountId, pod?.accountId);
    return { id: podId, ...pod };
  }
}
