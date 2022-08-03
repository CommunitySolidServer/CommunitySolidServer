import { Readable } from 'stream';
import { v4 } from 'uuid';
import type { HttpClient } from '../../http/client/HttpClient';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import { joinUrl, trimTrailingSlashes } from '../../util/PathUtil';
import { AS } from '../../util/Vocabularies';
import { BaseSubscriptionHandler } from '../BaseSubscriptionHandler';
import type { Subscription } from '../Subscription';

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
      id: this.generateId(request.topic),
    };
    return subscription;
  }

  private generateId(topic: string): string {
    return encodeURIComponent(`${topic}~~~${v4()}`);
  }

  private getUnsubscribeEndpoint(subscriptionId: string): string {
    return trimTrailingSlashes(joinUrl(this.baseUrl, this.webhookUnsubscribePath, subscriptionId));
  }

  public getResponseData(subscription: WebHookSubscription2021): Guarded<Readable> {
    return guardStream(
      Readable.from(
        JSON.stringify({
          '@context': 'https://www.w3.org/ns/solid/notification/v1',
          type: this.getType(),
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
        'https://www.w3.org/ns/solid/notification/v1',
      ],
      id: `urn:uuid:${v4()}`,
      type: [ subscription.type ],
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
