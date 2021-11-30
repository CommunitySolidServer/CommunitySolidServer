import { EventEmitter } from 'events';
import { Readable } from 'stream';
import type { NotificationGatewayHttpHandlerArgs } from '../../../src/http/NotificationGatewayHttpHandler';
import { NotificationGatewayHttpHandler } from '../../../src/http/NotificationGatewayHttpHandler';
import type { NotificationSubscriptionHttpHandlerArgs } from '../../../src/http/NotificationSubscriptionHttpHandler';
import { NotificationSubscriptionHttpHandler } from '../../../src/http/NotificationSubscriptionHttpHandler';
import { OkResponseDescription } from '../../../src/http/output/response/OkResponseDescription';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { Subscription, SubscriptionHandler } from '../../../src/notification/SubscriptionHandler';
import type { ModifiedResource } from '../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import type { Guarded } from '../../../src/util/GuardedStream';
import { guardStream } from '../../../src/util/GuardedStream';

class WhateverSubscriptionHandler implements SubscriptionHandler {
  public getType: () => string = function(): string {
    return 'WhateverSubscriptionHandler';
  };

  public getResponseData: () => Guarded<Readable> | undefined = function(): Guarded<Readable> | undefined {
    return undefined;
  };

  public subscribe: ((request: any) => Subscription) = function(): Subscription {
    return { type: 'WhateverSubscriptionHandler' };
  };

  public onResourcesChanged: (resources: ModifiedResource[], subscription: Subscription) => Promise<void> =
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async function(): Promise<void> {};
}

describe('A NotificationWellKnownHttpHandler', (): void => {
  const sourceMock = new EventEmitter();
  const subscriptionArgs: NotificationSubscriptionHttpHandlerArgs = {
    handlers: [ new WhateverSubscriptionHandler() ],
    source: sourceMock,
  } as any;
  const notificationSubscriptionHandler = new NotificationSubscriptionHttpHandler(subscriptionArgs);
  const gatewayArgs: NotificationGatewayHttpHandlerArgs = {
    baseUrl: 'BASEURL/',
    subscriptionPath: 'subscription',
    subscriptionHandler: notificationSubscriptionHandler,
  };
  const handler = new NotificationGatewayHttpHandler(gatewayArgs);
  it('handles POST requests.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation: { method: 'POST' } as any }))
      .resolves.not.toThrow(NotImplementedHttpError);
  });
  it('disallow GET requests.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation: { method: 'GET' } as any }))
      .rejects.toThrow(NotImplementedHttpError);
  });
  it('shoud not handle unconfigured notification types.', async(): Promise<void> => {
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: [ 'WebSocketSubscription2021', 'WebHookSubscription2021' ],
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const promise = handler.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    await expect(promise).rejects.toThrow(NotImplementedHttpError);
  });
  it('shoud handle configured notification types.', async(): Promise<void> => {
    const expectedJson = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WhateverSubscriptionHandler',
      endpoint: 'BASEURL/subscription',
      features: [],
    };
    const expectedData = guardStream(Readable.from(JSON.stringify(expectedJson)));
    const representationMetadata = new RepresentationMetadata('application/ld+json');
    const expectedResponse = new OkResponseDescription(representationMetadata, expectedData);

    const requestJson = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: [ 'WebSocketSubscription2021', 'WhateverSubscriptionHandler' ],
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(requestJson);
    };
    const response = await handler.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    const responseJson = response?.data?.read();

    expect(response?.statusCode).toEqual(expectedResponse.statusCode);
    expect(response?.metadata).toEqual(expectedResponse.metadata);
    expect(responseJson).toEqual(JSON.stringify(expectedJson));
  });
});
