import type { Store } from 'n3';
import type { Credentials } from '../../../authentication/Credentials';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { NOTIFY } from '../../../util/Vocabularies';
import { BaseChannelType, DEFAULT_NOTIFICATION_FEATURES } from '../BaseChannelType';
import type { NotificationChannel } from '../NotificationChannel';
import type { SubscriptionService } from '../NotificationChannelType';
import type { StateHandler } from '../StateHandler';
import { generateWebHookUnsubscribeUrl } from './WebHook2021Util';

/**
 * A {@link NotificationChannel} containing the necessary fields for a WebHookSubscription2021 channel.
 */
export interface WebHookSubscription2021Channel extends NotificationChannel {
  /**
   * The "WebHookSubscription2021" type.
   */
  type: typeof NOTIFY.WebHookSubscription2021;
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

/**
 * An extension of {@link SubscriptionService} adding the necessary `webid` field.
 * This is currently not part of a context so the terms are added in full to make sure the resulting RDF is valid.
 */
export interface WebHookSubscriptionService extends SubscriptionService {
  [NOTIFY.webid]: { id: string };
}

export function isWebHook2021Channel(channel: NotificationChannel): channel is WebHookSubscription2021Channel {
  return channel.type === NOTIFY.WebHookSubscription2021;
}

/**
 * The notification channel type WebHookSubscription2021 as described in
 * https://github.com/solid/notifications/blob/main/webhook-subscription-2021.md
 *
 * Requires read permissions on a resource to be able to receive notifications.
 *
 * Also handles the `state` feature if present.
 */
export class WebHookSubscription2021 extends BaseChannelType {
  protected readonly logger = getLoggerFor(this);

  private readonly unsubscribePath: string;
  private readonly stateHandler: StateHandler;
  private readonly webId: string;

  /**
   * @param route - The route corresponding to the URL of the subscription service of this channel type.
   * @param webIdRoute - The route to the WebID that needs to be used when generating DPoP tokens for notifications.
   * @param unsubscribeRoute - The route where the request needs to be sent to unsubscribe.
   * @param stateHandler - The {@link StateHandler} that will be called after a successful subscription.
   * @param features - The features that need to be enabled for this channel type.
   */
  public constructor(route: InteractionRoute, webIdRoute: InteractionRoute, unsubscribeRoute: InteractionRoute,
    stateHandler: StateHandler, features: string[] = DEFAULT_NOTIFICATION_FEATURES) {
    super(NOTIFY.terms.WebHookSubscription2021,
      route,
      [ ...features, NOTIFY.webhookAuth ],
      // Need to remember to remove `target` from the vocabulary again once this is updated to webhooks 2023,
      // as it is not actually part of the vocabulary.
      // Technically we should also require that this node is a named node,
      // but that would require clients to send `target: { '@id': 'http://example.com/target' }`,
      // which would make this more annoying so we are lenient here.
      // Could change in the future once this field is updated and part of the context.
      [{ path: NOTIFY.target, minCount: 1, maxCount: 1 }]);
    this.unsubscribePath = unsubscribeRoute.getPath();
    this.stateHandler = stateHandler;
    this.webId = webIdRoute.getPath();
  }

  public getDescription(): WebHookSubscriptionService {
    const base = super.getDescription();

    return {
      ...base,
      [NOTIFY.webid]: { id: this.webId },
    };
  }

  public async initChannel(data: Store, credentials: Credentials): Promise<WebHookSubscription2021Channel> {
    // The WebID is used to verify who can unsubscribe
    const webId = credentials.agent?.webId;

    if (!webId) {
      throw new BadRequestHttpError(
        'A WebHookSubscription2021 subscription request needs to be authenticated with a WebID.',
      );
    }

    const subject = await this.validateSubscription(data);
    const channel = await this.quadsToChannel(data, subject);
    const target = data.getObjects(subject, NOTIFY.terms.target, null)[0];

    return {
      ...channel,
      type: NOTIFY.WebHookSubscription2021,
      webId,
      target: target.value,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unsubscribe_endpoint: generateWebHookUnsubscribeUrl(this.unsubscribePath, channel.id),
    };
  }

  public async toJsonLd(channel: NotificationChannel): Promise<Record<string, unknown>> {
    const json = await super.toJsonLd(channel);

    // We don't want to expose the WebID that initialized the notification channel.
    // This is not really specified either way in the spec so this might change in the future.
    delete json.webId;

    return json;
  }

  public async completeChannel(channel: NotificationChannel): Promise<void> {
    try {
      // Send the state notification, if there is one
      await this.stateHandler.handleSafe({ channel });
    } catch (error: unknown) {
      this.logger.error(`Error emitting state notification: ${createErrorMessage(error)}`);
    }
  }
}
