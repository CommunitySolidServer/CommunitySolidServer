import { EventEmitter } from 'events';
import type { Readable } from 'stream';
import { ResponseDescription } from '../../../src';
import type { Credential, CredentialGroup } from '../../../src/authentication/Credentials';
import { CredentialsExtractor } from '../../../src/authentication/CredentialsExtractor';
import type { PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import { PermissionReader } from '../../../src/authorization/PermissionReader';
import type { AccessMode } from '../../../src/authorization/permissions/Permissions';
import type { NotificationSubscriptionHttpHandlerArgs } from '../../../src/http/NotificationSubscriptionHttpHandler';
import { NotificationSubscriptionHttpHandler } from '../../../src/http/NotificationSubscriptionHttpHandler';
// Iimport type { ResponseDescription } from '../../../src/http/output/response/ResponseDescription';
import { createResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { Subscription, SubscriptionHandler } from '../../../src/notification/SubscriptionHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import { MemoryMapStorage } from '../../../src/storage/keyvalue/MemoryMapStorage';
import type { ModifiedResource } from '../../../src/storage/ResourceStore';
import { createModifiedResource, ModificationType } from '../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import type { Guarded } from '../../../src/util/GuardedStream';

class WhateverSubscriptionHandler implements SubscriptionHandler {
  private readonly subscriptionHandeled: () => Promise<void>;
  public constructor(subscriptionHandled: () => Promise<void>) {
    this.subscriptionHandeled = subscriptionHandled;
  }

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
  async(): Promise<void> => this.subscriptionHandeled();
}

class MockCredentialsExtractor extends CredentialsExtractor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(input: HttpRequest): Promise<Partial<Record<CredentialGroup, Credential>>> {
    throw new Error('Method not implemented.');
  }
}

class CorruptCredentialsExtractor extends CredentialsExtractor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(input: HttpRequest): Promise<Partial<Record<CredentialGroup, Credential>>> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handleSafe(input: HttpRequest): Promise<Partial<Record<CredentialGroup, Credential>>> {
    return {
      agent: undefined,
    };
  }
}

class UnauthenticatedCredentialsExtractor extends CredentialsExtractor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(input: HttpRequest): Promise<Partial<Record<CredentialGroup, Credential>>> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handleSafe(input: HttpRequest): Promise<Partial<Record<CredentialGroup, Credential>>> {
    return {
      agent: { webId: undefined },
    };
  }
}

class AuthenticatedCredentialsExtractor extends CredentialsExtractor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(input: HttpRequest): Promise<Partial<Record<CredentialGroup, Credential>>> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handleSafe(input: HttpRequest): Promise<Partial<Record<CredentialGroup, Credential>>> {
    return {
      agent: { webId: 'WEBID' },
    };
  }
}

class MockPermissionReader extends PermissionReader {
  public async handle(input: PermissionReaderInput):
  Promise<Partial<Record<CredentialGroup, Partial<Record<AccessMode, boolean>>>>> {
    switch (input.identifier.path) {
      case 'https://pod.example/': return { agent: { read: true }};
      case 'https://pod.example/PublicDeny': return { public: { read: false }};
      case 'https://pod.example/PublicDenyAgentDeny': return { public: { read: false }, agent: { read: false }};
      case 'https://pod.example/AgentDeny': return { agent: { read: false }};
      case 'https://pod.example/AgentAllow': return { agent: { read: true }};
      default: return {};
    }
  }

  public async handleSafe(input: PermissionReaderInput):
  Promise<Partial<Record<CredentialGroup, Partial<Record<AccessMode, boolean>>>>> {
    return await this.handle(input);
  }
}

class AllowPermissionReader extends PermissionReader {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(input: PermissionReaderInput):
  Promise<Partial<Record<CredentialGroup, Partial<Record<AccessMode, boolean>>>>> {
    return {
      public: { read: true },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handleSafe(input: PermissionReaderInput):
  Promise<Partial<Record<CredentialGroup, Partial<Record<AccessMode, boolean>>>>> {
    return {
      public: { read: true },
    };
  }
}

describe('A NotificationSubscriptionHttpHandler', (): void => {
  const source = new EventEmitter();
  const eventsource = new EventEmitter();
  const countHandling = jest.fn();
  async function handleSubscription(): Promise<void> {
    countHandling();
    return new Promise<void>((resolve): void => resolve());
  }

  const subscriptionHandler = new WhateverSubscriptionHandler(handleSubscription);
  const subscriptionArgs: NotificationSubscriptionHttpHandlerArgs = {
    handlers: [ subscriptionHandler ],
    source,
    credentialsExtractor: new MockCredentialsExtractor(),
  } as any;
  const handler = new NotificationSubscriptionHttpHandler(subscriptionArgs);

  const authenticatedSubscriptionArgs: NotificationSubscriptionHttpHandlerArgs = {
    handlers: [ subscriptionHandler ],
    source,
    credentialsExtractor: new AuthenticatedCredentialsExtractor(),
    permissionReader: new MockPermissionReader(),
    notificationStorage: new MemoryMapStorage(),
  } as any;
  const authenticatedHandler = new NotificationSubscriptionHttpHandler(authenticatedSubscriptionArgs);

  const authenticatedSubscriptionArgs1: NotificationSubscriptionHttpHandlerArgs = {
    handlers: [ subscriptionHandler ],
    source: eventsource,
    credentialsExtractor: new AuthenticatedCredentialsExtractor(),
    permissionReader: new MockPermissionReader(),
    notificationStorage: new MemoryMapStorage(),
  } as any;
  const authenticatedHandler1 = new NotificationSubscriptionHttpHandler(authenticatedSubscriptionArgs1);

  it('shoud return configured notification types.', async(): Promise<void> => {
    const supportedTypes = handler.getSupportedTypes();
    expect(supportedTypes).toEqual([ 'WhateverSubscriptionHandler' ]);
  });
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
      type: 'WebSocketSubscription2021',
      topic: 'https://pod.example/resource',
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const promise = handler.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    await expect(promise).rejects.toThrow(BadRequestHttpError);
  });
  it('shoud deny corrupt clients.', async(): Promise<void> => {
    const denySubscriptionArgs: NotificationSubscriptionHttpHandlerArgs = {
      handlers: [ subscriptionHandler ],
      source,
      credentialsExtractor: new CorruptCredentialsExtractor(),
    } as any;
    const denyHandler = new NotificationSubscriptionHttpHandler(denySubscriptionArgs);
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WhateverSubscriptionHandler',
      topic: 'https://pod.example/resource',
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const promise = denyHandler.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    await expect(promise).rejects.toThrow(BadRequestHttpError);
  });
  it('shoud deny unauthenticated clients.', async(): Promise<void> => {
    const denySubscriptionArgs: NotificationSubscriptionHttpHandlerArgs = {
      handlers: [ subscriptionHandler ],
      source,
      credentialsExtractor: new UnauthenticatedCredentialsExtractor(),
    } as any;
    const denyHandler = new NotificationSubscriptionHttpHandler(denySubscriptionArgs);
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WhateverSubscriptionHandler',
      topic: 'https://pod.example/resource',
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const promise = denyHandler.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    await expect(promise).rejects.toThrow(BadRequestHttpError);
  });
  it('shoud deny unauthorized subscription - public deny, no agent match.', async(): Promise<void> => {
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WhateverSubscriptionHandler',
      topic: 'https://pod.example/PublicDeny',
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const promise = authenticatedHandler.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    await expect(promise).rejects.toThrow(BadRequestHttpError);
  });
  it('shoud deny unauthorized subscription - public deny, agent deny.', async(): Promise<void> => {
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WhateverSubscriptionHandler',
      topic: 'https://pod.example/PublicAllowAgentDeny',
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const promise = authenticatedHandler.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    await expect(promise).rejects.toThrow(BadRequestHttpError);
  });
  it('shoud allow authorized subscription.', async(): Promise<void> => {
    subscriptionArgs.permissionReader = new AllowPermissionReader();
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WhateverSubscriptionHandler',
      topic: 'https://pod.example/AgentAllow',
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const promise = authenticatedHandler.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    await expect(promise).resolves.not.toBeNull();
  });
  it('shoud handle notification event when resource is modified.', async(): Promise<void> => {
    countHandling.mockReset();
    subscriptionArgs.permissionReader = new AllowPermissionReader();
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WhateverSubscriptionHandler',
      topic: 'https://pod.example/AgentAllow',
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const res = await authenticatedHandler1.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    expect(res).toBeInstanceOf(ResponseDescription);
    const modifiedResources: ModifiedResource[] = [
      createModifiedResource(createResourceIdentifier('https://pod.example/'), ModificationType.changed),
      createModifiedResource(createResourceIdentifier('https://pod.example/AgentAllow'), ModificationType.created),
    ];
    expect(countHandling).toHaveBeenCalledTimes(0);
    eventsource.emit('changed', modifiedResources);
    // eslint-disable-next-line func-style
    const aSecond: () => Promise<void> = async function(): Promise<void> {
      return new Promise<void>((resolve): void => {
        setTimeout((): void => resolve(), 1000);
      });
    };
    await aSecond();

    expect(countHandling).toHaveBeenCalledTimes(1);
  });
  it('shoud skip notification event when resource is not subscribed.', async(): Promise<void> => {
    countHandling.mockReset();
    subscriptionArgs.permissionReader = new AllowPermissionReader();
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WhateverSubscriptionHandler',
      topic: 'https://pod.example/',
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const res = await authenticatedHandler1.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    expect(res).toBeInstanceOf(ResponseDescription);
    const modifiedResources: ModifiedResource[] = [
      createModifiedResource(createResourceIdentifier('https://pod.example/'), ModificationType.changed),
      createModifiedResource(createResourceIdentifier('https://pod.example/AgentAllow'), ModificationType.created),
    ];
    expect(countHandling).toHaveBeenCalledTimes(0);
    eventsource.emit('changed', modifiedResources);
    // eslint-disable-next-line func-style
    const aSecond: () => Promise<void> = async function(): Promise<void> {
      return new Promise<void>((resolve): void => {
        setTimeout((): void => resolve(), 1000);
      });
    };
    await aSecond();

    expect(countHandling).toHaveBeenCalledTimes(1);
  });

  it('shoud use stored topic.', async(): Promise<void> => {
    countHandling.mockReset();
    subscriptionArgs.permissionReader = new AllowPermissionReader();
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WhateverSubscriptionHandler',
      topic: 'https://pod.example/',
    };
    // eslint-disable-next-line func-style
    const readFn: () => Promise<any> = async function(): Promise<any> {
      return JSON.stringify(json);
    };
    const res = await authenticatedHandler1.handle({ operation: { method: 'POST' }, request: { read: readFn }} as any);
    expect(res).toBeInstanceOf(ResponseDescription);
    const modifiedResources: ModifiedResource[] = [
      createModifiedResource(createResourceIdentifier('https://pod.example/'), ModificationType.changed),
      createModifiedResource(createResourceIdentifier('https://pod.example/AgentAllow'), ModificationType.created),
    ];
    expect(countHandling).toHaveBeenCalledTimes(0);
    eventsource.emit('changed', modifiedResources);
    // eslint-disable-next-line func-style
    const aSecond: () => Promise<void> = async function(): Promise<void> {
      return new Promise<void>((resolve): void => {
        setTimeout((): void => resolve(), 1000);
      });
    };
    await aSecond();

    expect(countHandling).toHaveBeenCalledTimes(1);
  });
});
