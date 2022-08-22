import { Readable } from 'stream';
import { v4 } from 'uuid';
import type { HttpClient } from '../../http/client/HttpClient';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import { joinUrl, trimTrailingSlashes } from '../../util/PathUtil';
import { AS, SOLID_NOTIFICATION } from '../../util/Vocabularies';
import { BaseSubscriptionHandler } from '../BaseSubscriptionHandler';
import type { Subscription } from '../Subscription';
import { generateSubscriptionId } from '../Subscription';

export interface WebHookSubscription2021 extends Subscription {
  id: string;
  target: string;
}

export class WebHookSubscription2021Handler extends BaseSubscriptionHandler<WebHookSubscription2021> {
  protected readonly logger = getLoggerFor(this);

  public constructor(
    private readonly httpClient: HttpClient,
    private readonly webhookUnsubscribePath: string,
    private readonly baseUrl: string,
  ) {
    super();
  }

  public subscribe(request: any): WebHookSubscription2021 {
    const subscription: WebHookSubscription2021 = {
      type: this.getType(),
      target: request.target,
      id: generateSubscriptionId(request.topic),
    };
    return subscription;
  }

  private getUnsubscribeEndpoint(subscriptionId: string): string {
    return trimTrailingSlashes(joinUrl(this.baseUrl, this.webhookUnsubscribePath, subscriptionId));
  }

  public getResponseData(subscription: WebHookSubscription2021, topic: string): Guarded<Readable> {
    return guardStream(
      Readable.from(
        JSON.stringify({
          '@context': SOLID_NOTIFICATION.namespace,
          type: this.getType(),
          topic,
          target: subscription.target,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          unsubscribe_endpoint: this.getUnsubscribeEndpoint(subscription.id),
        }),
      ),
    );
  }

  public getType(): string {
    return 'WebHookSubscription2021';
  }

  public async onResourceCreated(resource: ResourceIdentifier, subscription: WebHookSubscription2021): Promise<void> {
    this.logger.debug(`Resource created ${resource.path}`);
    return this.sendNotification(AS.Create, resource, subscription);
  }

  public async onResourceUpdated(resource: ResourceIdentifier, subscription: WebHookSubscription2021): Promise<void> {
    this.logger.debug(`Resource updated ${resource.path}`);
    return this.sendNotification(AS.Update, resource, subscription);
  }

  public async onResourceDeleted(resource: ResourceIdentifier, subscription: WebHookSubscription2021): Promise<void> {
    this.logger.debug(`Resource deleted ${resource.path}`);
    return this.sendNotification(AS.Delete, resource, subscription);
  }

  private async sendNotification(
    type: string,
    resource: ResourceIdentifier,
    subscription: WebHookSubscription2021,
  ): Promise<void> {
    const payload = {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        SOLID_NOTIFICATION.namespace,
      ],
      id: `urn:uuid:${v4()}`,
      type: [ type ],
      object: {
        id: resource.path,
      },
      published: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unsubscribe_endpoint: this.getUnsubscribeEndpoint(subscription.id),
    };

    const requestBody = JSON.stringify(payload);
    const reqOptions = {
      method: 'POST',
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/ld+json',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    this.logger.debug(`Calling ${subscription.target} ...`);
    try {
      const response = await this.httpClient.call(subscription.target, reqOptions, requestBody);
      this.logger.debug(`Response code: ${response.statusCode}`);
      this.logger.debug(`Received headers: ${JSON.stringify(response.headers)}`);
    } catch (error: unknown) {
      this.logger.debug(`Failed to inform subscription target: ${error}`);
    }
  }
}
