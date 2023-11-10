import type { Store } from 'n3';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { NOTIFY } from '../../../util/Vocabularies';
import { BaseChannelType } from '../BaseChannelType';
import type { NotificationChannel } from '../NotificationChannel';
import type { StateHandler } from '../StateHandler';

/**
 * A {@link NotificationChannel} containing the necessary fields for a WebhookChannel2023 channel.
 */
export interface WebhookChannel2023 extends NotificationChannel {
  /**
   * The "WebhookChannel2023" type.
   */
  type: typeof NOTIFY.WebhookChannel2023;
  /**
   * Where the notifications have to be sent.
   */
  sendTo: string;
}

export function isWebhook2023Channel(channel: NotificationChannel): channel is WebhookChannel2023 {
  return channel.type === NOTIFY.WebhookChannel2023;
}

/**
 * The notification channel type WebhookChannel2023 as described in
 * https://solid.github.io/notifications/webhook-channel-2023
 *
 * Requires read permissions on a resource to be able to receive notifications.
 *
 * Also handles the `state` feature if present.
 */
export class WebhookChannel2023Type extends BaseChannelType {
  protected readonly logger = getLoggerFor(this);

  private readonly stateHandler: StateHandler;
  private readonly webId: string;

  /**
   * @param route - The route corresponding to the URL of the subscription service of this channel type.
   * @param webIdRoute - The route to the WebID that needs to be used when generating DPoP tokens for notifications.
   * @param stateHandler - The {@link StateHandler} that will be called after a successful subscription.
   * @param features - The features that need to be enabled for this channel type.
   */
  public constructor(
    route: InteractionRoute,
    webIdRoute: InteractionRoute,
    stateHandler: StateHandler,
    features?: string[],
  ) {
    super(NOTIFY.terms.WebhookChannel2023, route, features, [{ path: NOTIFY.sendTo, minCount: 1, maxCount: 1 }]);
    this.stateHandler = stateHandler;
    this.webId = webIdRoute.getPath();
  }

  public async initChannel(data: Store): Promise<WebhookChannel2023> {
    const subject = await this.validateSubscription(data);
    const channel = await this.quadsToChannel(data, subject);
    const sendTo = data.getObjects(subject, NOTIFY.terms.sendTo, null)[0];

    return {
      ...channel,
      type: NOTIFY.WebhookChannel2023,
      sendTo: sendTo.value,
    };
  }

  public async toJsonLd(channel: NotificationChannel): Promise<Record<string, unknown>> {
    const json = await super.toJsonLd(channel);

    // Add the stored WebID as sender.
    // We don't store it in the channel object itself as we always know what it is anyway.
    json.sender = this.webId;

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
