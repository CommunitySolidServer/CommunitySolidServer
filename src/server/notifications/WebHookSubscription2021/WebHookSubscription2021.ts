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
import type { NotificationChannel } from '../NotificationChannel';
import { NOTIFICATION_CHANNEL_SCHEMA } from '../NotificationChannel';
import type { NotificationChannelStorage } from '../NotificationChannelStorage';
import type { NotificationChannelResponse, NotificationChannelType } from '../NotificationChannelType';
import type { StateHandler } from '../StateHandler';
import { generateWebHookUnsubscribeUrl } from './WebHook2021Util';

const type = 'WebHookSubscription2021';
const schema = NOTIFICATION_CHANNEL_SCHEMA.shape({
  type: string().required().oneOf([ type ]),
  // Not using `.url()` validator since it does not support localhost URLs
  target: string().required(),
});

/**
 * A {@link NotificationChannel} containing the necessary fields for a WebHookSubscription2021 channel.
 */
export interface WebHookSubscription2021Channel extends NotificationChannel {
  /**
   * The "WebHookSubscription2021" type.
   */
  type: typeof type;
  /**
   * Where the notifications have to be sent.
   */
  target: string;
  /**
   * The WebID of the agent subscribing to the channel.
   */
  webId: string;
  /**
   * Where the agent can unsubscribe from the channel.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  unsubscribe_endpoint: string;
}

export function isWebHook2021Channel(channel: NotificationChannel): channel is WebHookSubscription2021Channel {
  return channel.type === type;
}

/**
 * The notification channel type WebHookSubscription2021 as described in
 * https://github.com/solid/notifications/blob/main/webhook-subscription-2021.md
 *
 * Requires read permissions on a resource to be able to receive notifications.
 *
 * Also handles the `state` feature if present.
 */
export class WebHookSubscription2021 implements NotificationChannelType<typeof schema> {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: NotificationChannelStorage;
  private readonly unsubscribePath: string;
  private readonly stateHandler: StateHandler;

  public readonly type = type;
  public readonly schema = schema;

  public constructor(storage: NotificationChannelStorage, unsubscribeRoute: InteractionRoute,
    stateHandler: StateHandler) {
    this.storage = storage;
    this.unsubscribePath = unsubscribeRoute.getPath();
    this.stateHandler = stateHandler;
  }

  public async extractModes(json: InferType<typeof schema>): Promise<AccessMap> {
    return new IdentifierSetMultiMap<AccessMode>([[{ path: json.topic }, AccessMode.read ]]);
  }

  public async subscribe(json: InferType<typeof schema>, credentials: Credentials):
  Promise<NotificationChannelResponse> {
    const webId = credentials.agent?.webId;

    if (!webId) {
      throw new BadRequestHttpError(
        'A WebHookSubscription2021 subscription request needs to be authenticated with a WebID.',
      );
    }

    const channel = this.storage.create(json, { target: json.target, webId });
    await this.storage.add(channel);

    const jsonld = {
      '@context': [ CONTEXT_NOTIFICATION ],
      type: this.type,
      target: json.target,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unsubscribe_endpoint: generateWebHookUnsubscribeUrl(this.unsubscribePath, channel.id),
    };
    const response = new BasicRepresentation(JSON.stringify(jsonld), APPLICATION_LD_JSON);

    // We want to send the state notification, if there is one,
    // right after we send the response for subscribing.
    // We do this by waiting for the response to be closed.
    endOfStream(response.data)
      .then((): Promise<void> => this.stateHandler.handleSafe({ channel }))
      .catch((error): void => {
        this.logger.error(`Error emitting state notification: ${createErrorMessage(error)}`);
      });

    return { response, channel };
  }
}
