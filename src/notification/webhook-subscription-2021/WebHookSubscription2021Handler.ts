import type { IncomingMessage } from 'http';
import { Readable } from 'stream';
import { v4 } from 'uuid';
import type { HttpClient } from '../../http/client/HttpClient';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import { joinUrl, trimTrailingSlashes } from '../../util/PathUtil';
import { BaseSubscriptionHandler } from '../BaseSubscriptionHandler';
import type { Subscription } from '../SubscriptionHandler';

export interface WebHookSubscription2021 extends Subscription {
  id: string;
  target: string;
}

export interface WebHookSubscription2021Args {
  /**
   * Writes out the response of the operation.
   */
  httpClient: HttpClient;
  webhookUnsubscribePath: string;
  baseUrl: string;
}

export class WebHookSubscription2021Handler extends BaseSubscriptionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly httpClient: HttpClient;
  private readonly webhookUnsubscribePath: string;
  private readonly baseUrl: string;

  public constructor(args: WebHookSubscription2021Args) {
    super();
    this.httpClient = args.httpClient;
    this.webhookUnsubscribePath = args.webhookUnsubscribePath;
    this.baseUrl = args.baseUrl;

    // To get "this" to work, you need to bind all the methods
    this.subscribe = this.subscribe.bind(this);
    this.getResponseData = this.getResponseData.bind(this);
    this.getType = this.getType.bind(this);
    this.onResourceChanged = this.onResourceChanged.bind(this);
    this.onResourceCreated = this.onResourceCreated.bind(this);
    this.onResourceDeleted = this.onResourceDeleted.bind(this);
    this.onResourcesChanged = this.onResourcesChanged.bind(this);
    this.sendNotification = this.sendNotification.bind(this);
  }

  public subscribe(request: any): Subscription {
    const subscription: WebHookSubscription2021 = {
      type: this.getType(),
      target: request.target,
      id: encodeURIComponent(`${request.topic}~~~${v4()}`),
    };
    return subscription;
  }

  private getUnsubscribeEndpoint(subscriptionId: string): string {
    return trimTrailingSlashes(joinUrl(this.baseUrl, this.webhookUnsubscribePath, subscriptionId));
  }

  public getResponseData(subscription: Subscription): Guarded<Readable> | undefined {
    const webhookSubscription = subscription as WebHookSubscription2021;
    if (webhookSubscription.target && webhookSubscription.id) {
      return guardStream(
        Readable.from(
          JSON.stringify({
            '@context': 'https://www.w3.org/ns/solid/notification/v1',
            type: 'WebHookSubscription2021',
            target: webhookSubscription.target,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            unsubscribe_endpoint: this.getUnsubscribeEndpoint(webhookSubscription.id),
          }),
        ),
      );
    }
    return undefined;
  }

  public getType(): string {
    return 'WebHookSubscription2021';
  }

  public async onResourceCreated(
    resource: ResourceIdentifier,
    subscription: Subscription,
  ): Promise<void> {
    this.logger.debug(`Resource created ${resource.path}`);
    return this.sendNotification('Create', resource, subscription);
  }

  public async onResourceChanged(
    resource: ResourceIdentifier,
    subscription: Subscription,
  ): Promise<void> {
    this.logger.debug(`Resource changed ${resource.path}`);
    return this.sendNotification('Update', resource, subscription);
  }

  public async onResourceDeleted(
    resource: ResourceIdentifier,
    subscription: Subscription,
  ): Promise<void> {
    this.logger.debug(`Resource deleted ${resource.path}`);
    return this.sendNotification('Delete', resource, subscription);
  }

  private async sendNotification(
    type: string,
    resource: ResourceIdentifier,
    subscription: Subscription,
  ): Promise<void> {
    const { target, id } = subscription as WebHookSubscription2021;

    const payload = {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        'https://www.w3.org/ns/solid/notification/v1',
      ],
      id: `urn:uuid:${v4()}`,
      type: [ type ],
      object: {
        id: resource.path,
      },
      published: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unsubscribe_endpoint: this.getUnsubscribeEndpoint(id),
    };

    const requestBody = JSON.stringify(payload);

    const reqOptions = {
      method: 'POST',
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    this.logger.debug(`Calling ${target} ...`);
    const response: IncomingMessage = await this.httpClient.call(target, reqOptions, requestBody);
    this.logger.debug(`Response code: ${response.statusCode}`);
    this.logger.debug(`Received headers: ${JSON.stringify(response.headers)}`);
  }
}
