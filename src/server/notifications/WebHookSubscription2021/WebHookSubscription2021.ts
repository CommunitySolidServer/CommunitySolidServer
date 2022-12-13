import type { InferType } from 'yup';
import { string } from 'yup';
import type { Credentials } from '../../../authentication/Credentials';
import type { AccessMap } from '../../../authorization/permissions/Permissions';
import { AccessMode } from '../../../authorization/permissions/Permissions';
import { BasicRepresentation } from '../../../http/representation/BasicRepresentation';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { APPLICATION_LD_JSON } from '../../../util/ContentTypes';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { IdentifierSetMultiMap } from '../../../util/map/IdentifierMap';
import { endOfStream } from '../../../util/StreamUtil';
import { CONTEXT_NOTIFICATION } from '../Notification';
import type { StateHandler } from '../StateHandler';
import { SUBSCRIBE_SCHEMA } from '../Subscription';
import type { SubscriptionStorage } from '../SubscriptionStorage';
import type { SubscriptionResponse, SubscriptionType } from '../SubscriptionType';
import { generateWebHookUnsubscribeUrl } from './WebHook2021Util';

const type = 'WebHookSubscription2021';
const schema = SUBSCRIBE_SCHEMA.shape({
  type: string().required().oneOf([ type ]),
  // Not using `.url()` validator since it does not support localhost URLs
  target: string().required(),
});

export type WebHookFeatures = { target: string; webId: string };

/**
 * The notification subscription type WebHookSubscription2021 as described in
 * https://github.com/solid/notifications/blob/main/webhook-subscription-2021.md
 *
 * Requires read permissions on a resource to be able to receive notifications.
 *
 * Also handles the `state` feature if present.
 */
export class WebHookSubscription2021 implements SubscriptionType<typeof schema, WebHookFeatures> {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: SubscriptionStorage<WebHookFeatures>;
  private readonly unsubscribePath: string;
  private readonly stateHandler: StateHandler;

  public readonly type = type;
  public readonly schema = schema;

  public constructor(storage: SubscriptionStorage<WebHookFeatures>, unsubscribeRoute: InteractionRoute,
    stateHandler: StateHandler) {
    this.storage = storage;
    this.unsubscribePath = unsubscribeRoute.getPath();
    this.stateHandler = stateHandler;
  }

  public async extractModes(subscription: InferType<typeof schema>): Promise<AccessMap> {
    return new IdentifierSetMultiMap<AccessMode>([[{ path: subscription.topic }, AccessMode.read ]]);
  }

  public async subscribe(subscription: InferType<typeof schema>, credentials: Credentials):
  Promise<SubscriptionResponse<WebHookFeatures>> {
    const webId = credentials.agent?.webId;

    if (!webId) {
      throw new BadRequestHttpError(
        'A WebHookSubscription2021 subscription request needs to be authenticated with a WebID.',
      );
    }

    const info = this.storage.create(subscription, { target: subscription.target, webId });
    await this.storage.add(info);

    const jsonld = {
      '@context': [ CONTEXT_NOTIFICATION ],
      type: this.type,
      target: subscription.target,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unsubscribe_endpoint: generateWebHookUnsubscribeUrl(this.unsubscribePath, info.id),
    };
    const response = new BasicRepresentation(JSON.stringify(jsonld), APPLICATION_LD_JSON);

    // We want to send the state notification, if there is one,
    // right after we send the response for subscribing.
    // We do this by waiting for the response to be closed.
    endOfStream(response.data)
      .then((): Promise<void> => this.stateHandler.handleSafe({ info }))
      .catch((error): void => {
        this.logger.error(`Error emitting state notification: ${createErrorMessage(error)}`);
      });

    return { response, info };
  }
}
