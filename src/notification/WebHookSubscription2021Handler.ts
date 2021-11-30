/* eslint-disable no-console */
import { Readable } from 'stream';
import { v4 } from 'uuid';
import type { HttpClient } from '../http/client/HttpClient';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { Guarded } from '../util/GuardedStream';
import { guardStream } from '../util/GuardedStream';
import { BaseSubscriptionHandler } from './BaseSubscriptionHandler';
import type { Subscription } from './SubscriptionHandler';

export interface WebHookSubscription2021 extends Subscription {
  target: string;
}

export interface WebHookSubscription2021Args {
  /**
   * Writes out the response of the operation.
   */
  httpClient: HttpClient;
}

export class WebHookSubscription2021Handler extends BaseSubscriptionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {
    super();
    this.httpClient = httpClient;
  }

  public subscribe(request: any): Subscription {
    const subscription: WebHookSubscription2021 = {
      type: this.getType(),
      target: request.target,
    };
    return subscription;
  }

  public getResponseData(): Guarded<Readable> | undefined {
    return guardStream(
      Readable.from(
        JSON.stringify({
          '@context': 'https://www.w3.org/ns/solid/notification/v1',
          type: 'WebHookSubscription2021',
        }),
      ),
    );
  }

  public getType(): string {
    return 'WebHookSubscription2021';
  }

  public async onResourceCreated(
    resource: ResourceIdentifier,
    subscription: Subscription,
  ): Promise<void> {
    this.logger.info(`Resource created ${resource.path}`);
    this.sendNotification('Create', resource, subscription);
  }

  public async onResourceChanged(
    resource: ResourceIdentifier,
    subscription: Subscription,
  ): Promise<void> {
    this.logger.info(`Resource changed ${resource.path}`);
    this.sendNotification('Update', resource, subscription);
  }

  public async onResourceDeleted(
    resource: ResourceIdentifier,
    subscription: Subscription,
  ): Promise<void> {
    this.logger.info(`Resource deleted ${resource.path}`);
    this.sendNotification('Delete', resource, subscription);
  }

  private sendNotification(
    type: string,
    resource: ResourceIdentifier,
    subscription: Subscription,
  ): void {
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

    const { target } = subscription as WebHookSubscription2021;
    this.httpClient.call(target, reqOptions, requestBody, (res): void => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      res.on('data', (chunk): void => {
        console.log(`BODY: ${chunk}`);
      });
      res.on('end', (): void => {
        console.log('No more data in response.');
      });
    });
  }
}
