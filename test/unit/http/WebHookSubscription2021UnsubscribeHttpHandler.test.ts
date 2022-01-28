import { createResponse } from 'node-mocks-http';
import type { CredentialSet } from '../../../src/authentication/Credentials';
import { CredentialGroup } from '../../../src/authentication/Credentials';
import type { CredentialsExtractor } from '../../../src/authentication/CredentialsExtractor';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { WebHookSubscription2021UnsubscribeHttpHandler }
  from '../../../src/http/WebHookSubscription2021UnsubscribeHttpHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';

describe('A WebHookSubscription2021UnsubscribeHttpHandler', (): void => {
  const credentialsExtractor: CredentialsExtractor = {
    canHandle: jest.fn(),
    handle: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handleSafe: jest.fn(async(request: HttpRequest): Promise<CredentialSet> => ({ [CredentialGroup.agent]: { webId: 'http://alice.example/card#me' }})),
  };
  const storageMap = new Map();
  const notificationStorage = {
    get: jest.fn((id: string): any => storageMap.get(id)),
    set: jest.fn((id: string, value: any): any => storageMap.set(id, value)),
  } as any;
  it('throws error if no credential group agent present in request.', async(): Promise<void> => {
    const noCredentialsExtractor: CredentialsExtractor = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handleSafe: jest.fn(async(request: HttpRequest): Promise<CredentialSet> =>
        ({ [CredentialGroup.public]: undefined })),
    };
    const webHookSubscription2021UnsubscribeHttpHandler = new WebHookSubscription2021UnsubscribeHttpHandler({
      baseUrl: 'http://server/',
      credentialsExtractor: noCredentialsExtractor,
      notificationStorage,
    });
    const metadata = new RepresentationMetadata();
    const data = guardedStreamFrom([ 'data' ]);
    const request = guardedStreamFrom([ 'test' ]) as HttpRequest;
    const response = createResponse() as HttpResponse;
    const promise = webHookSubscription2021UnsubscribeHttpHandler.handle({
      operation: {
        method: '',
        target: { path: '' },
        preferences: {},
        body: { metadata, data, binary: false, isEmpty: true },
      },
      request,
      response,
    });
    await expect(promise).rejects.toThrow(new BadRequestHttpError('No WebId present in request'));
  });
  it('throws error if no webId present in request.', async(): Promise<void> => {
    const noCredentialsExtractor: CredentialsExtractor = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handleSafe: jest.fn(async(request: HttpRequest): Promise<CredentialSet> =>
        ({ [CredentialGroup.agent]: { webId: undefined }})),
    };
    const webHookSubscription2021UnsubscribeHttpHandler = new WebHookSubscription2021UnsubscribeHttpHandler({
      baseUrl: 'http://server/',
      credentialsExtractor: noCredentialsExtractor,
      notificationStorage,
    });
    const metadata = new RepresentationMetadata();
    const data = guardedStreamFrom([ 'data' ]);
    const request = guardedStreamFrom([ 'test' ]) as HttpRequest;
    const response = createResponse() as HttpResponse;
    const promise = webHookSubscription2021UnsubscribeHttpHandler.handle({
      operation: {
        method: '',
        target: { path: '' },
        preferences: {},
        body: { metadata, data, binary: false, isEmpty: true },
      },
      request,
      response,
    });
    await expect(promise).rejects.toThrow(new BadRequestHttpError('No WebId present in request'));
  });
  it('throws error if no url present in request.', async(): Promise<void> => {
    const webHookSubscription2021UnsubscribeHttpHandler = new WebHookSubscription2021UnsubscribeHttpHandler({
      baseUrl: 'http://server/',
      credentialsExtractor,
      notificationStorage,
    });
    const metadata = new RepresentationMetadata();
    const data = guardedStreamFrom([ 'data' ]);
    const request = guardedStreamFrom([ 'test' ]) as HttpRequest;
    const response = createResponse() as HttpResponse;
    const promise = webHookSubscription2021UnsubscribeHttpHandler.handle({
      operation: {
        method: '',
        target: { path: '' },
        preferences: {},
        body: { metadata, data, binary: false, isEmpty: true },
      },
      request,
      response,
    });
    await expect(promise).rejects.toThrow(new BadRequestHttpError('No url present in request'));
  });
  it('throws error if there is no matching subscription.', async(): Promise<void> => {
    const webHookSubscription2021UnsubscribeHttpHandler = new WebHookSubscription2021UnsubscribeHttpHandler({
      baseUrl: 'http://server/',
      credentialsExtractor,
      notificationStorage,
    });
    const metadata = new RepresentationMetadata();
    const data = guardedStreamFrom([ 'data' ]);
    const request = guardedStreamFrom([ 'test' ]) as HttpRequest;
    request.method = 'DELETE';
    request.url = 'BASEURL/webhook/http%3A%2F%2Flocalhost%3A9999%2Fresource~~~80d63ab0-afd0-464a-bc10-252b6d6fde0e';
    const response = createResponse() as HttpResponse;
    const promise = webHookSubscription2021UnsubscribeHttpHandler.handle({
      operation: {
        method: '',
        target: { path: '' },
        preferences: {},
        body: { metadata, data, binary: false, isEmpty: true },
      },
      request,
      response,
    });
    await expect(promise).rejects.toThrow(new BadRequestHttpError('Subscription does not exist'));
  });
  it('delete subscription if present.', async(): Promise<void> => {
    storageMap.set('http://localhost:9999/resource', {
      subscriptions: {
        'http://alice.example/card#me': {
          type: 'WebHookSubscription2021',
          target: '',
          id: 'http%3A%2F%2Flocalhost%3A9999%2Fresource~~~80d63ab0-afd0-464a-bc10-252b6d6fde0e',
        },
        'http://bob.example/card#me': {
          type: 'WebHookSubscription2021',
          target: '',
          id: 'http%3A%2F%2Flocalhost%3A9999%2Fresource~~~00000000-afd0-464a-bc10-252b6d6fde0e',
        },
      },
    });
    const webHookSubscription2021UnsubscribeHttpHandler = new WebHookSubscription2021UnsubscribeHttpHandler({
      baseUrl: 'http://server/',
      credentialsExtractor,
      notificationStorage,
    });
    const metadata = new RepresentationMetadata();
    const data = guardedStreamFrom([ 'data' ]);
    const request = guardedStreamFrom([ 'test' ]) as HttpRequest;
    request.method = 'DELETE';
    request.url = 'BASEURL/webhook/http%3A%2F%2Flocalhost%3A9999%2Fresource~~~80d63ab0-afd0-464a-bc10-252b6d6fde0e';
    const response = createResponse() as HttpResponse;
    const promise = webHookSubscription2021UnsubscribeHttpHandler.handle({
      operation: {
        method: '',
        target: { path: '' },
        preferences: {},
        body: { metadata, data, binary: false, isEmpty: true },
      },
      request,
      response,
    });
    await expect(promise).resolves.not.toThrow();
    const subscription = storageMap.get('http://localhost:9999/resource');
    expect(subscription).toEqual({ subscriptions: { 'http://bob.example/card#me': { id: 'http%3A%2F%2Flocalhost%3A9999%2Fresource~~~00000000-afd0-464a-bc10-252b6d6fde0e', target: '', type: 'WebHookSubscription2021' }}});
  });
});

