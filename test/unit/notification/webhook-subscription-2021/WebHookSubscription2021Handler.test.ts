import type { HttpClient } from '../../../../src/http/client/HttpClient';
import type { WebHookSubscription2021 }
  from '../../../../src/notification/webhook-subscription-2021/WebHookSubscription2021Handler';
import { WebHookSubscription2021Handler }
  from '../../../../src/notification/webhook-subscription-2021/WebHookSubscription2021Handler';

describe('A WebHookSubscription2021Handler', (): void => {
  let httpClient: HttpClient;
  let handler: WebHookSubscription2021Handler;
  beforeEach(async(): Promise<void> => {
    httpClient = {
      call: jest.fn(async(): Promise<any> => Promise.resolve({})),
    };
    handler = new WebHookSubscription2021Handler({
      httpClient,
      webhookUnsubscribePath: 'webhook',
      baseUrl: 'BASEURL/',
    });
  });

  it('should return the implemented notification type.', (): void => {
    const type = handler.getType();
    expect(type).toEqual('WebHookSubscription2021');
  });
  it('should return the expected subscription when subscribed to.', (): void => {
    const subscriptionRequest = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WebHookSubscription2021',
      topic: 'http://localhost:3000/source/foo/',
      target: 'http://localhost:9999/webhook',
    };
    const type = handler.subscribe(subscriptionRequest) as WebHookSubscription2021;
    expect(type.target).toBe('http://localhost:9999/webhook');
    expect(type.type).toBe('WebHookSubscription2021');
    expect(type.id.startsWith('http%3A%2F%2Flocalhost%3A3000%2Fsource%2Ffoo%2F')).toBe(true);
  });
  it('should return the expected object when asked for response data.', (): void => {
    const reader = handler.getResponseData({
      type: 'WebHookSubscription2021',
      target: 'http://localhost.9999/webhook',
      topic: 'http://example.pod/resource',
      id: 'http%3A%2F%2Flocalhost%3A9999%2Fresource~~~80d63ab0-afd0-464a-bc10-252b6d6fde0e',
    } as WebHookSubscription2021);
    const data = reader?.read();
    expect(JSON.parse(data)).toMatchObject({
      '@context': 'https://www.w3.org/ns/solid/notification/v1',
      type: 'WebHookSubscription2021',
      target: 'http://localhost.9999/webhook',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unsubscribe_endpoint:
        'BASEURL/webhook/http%3A%2F%2Flocalhost%3A9999%2Fresource~~~80d63ab0-afd0-464a-bc10-252b6d6fde0e',
    });
  });
  it('should return unknown when asked for response data without target given.', (): void => {
    const reader = handler.getResponseData({
      type: 'WebHookSubscription2021',
      target: null as unknown,
      topic: 'http://example.pod/resource',
      id: 'http%3A%2F%2Flocalhost%3A9999%2Fresource~~~80d63ab0-afd0-464a-bc10-252b6d6fde0e',
    } as WebHookSubscription2021);
    expect(reader).toBeUndefined();
  });
  it('should return unknown when asked for response data without id given.', (): void => {
    const reader = handler.getResponseData({
      type: 'WebHookSubscription2021',
      target: 'http://localhost.9999/webhook',
      topic: 'http://example.pod/resource',
      id: null as unknown,
    } as WebHookSubscription2021);
    expect(reader).toBeUndefined();
  });
  it('should call target onResourceCreated.', async(): Promise<void> => {
    const callSpy = jest.spyOn(httpClient, 'call');
    await handler.onResourceCreated({ path: 'webhook-url' }, {
      id: 'http%3A%2F%2Flocalhost%3A3000%2Fsource%2Ffoo%2F~~~0e9c66ab-d71a-459e-ab6e-8c8c84c8f617',
      type: 'WebHookSubscription2021',
      target: 'http://localhost:9999/webhook',
    } as WebHookSubscription2021);
    expect(callSpy).toHaveBeenCalledTimes(1);
  });
  it('should call target onResourceChanged.', async(): Promise<void> => {
    const callSpy = jest.spyOn(httpClient, 'call');
    await handler.onResourceChanged({ path: 'webhook-url' }, {
      id: 'http%3A%2F%2Flocalhost%3A3000%2Fsource%2Ffoo%2F~~~0e9c66ab-d71a-459e-ab6e-8c8c84c8f617',
      type: 'WebHookSubscription2021',
      target: 'http://localhost:9999/webhook',
    } as WebHookSubscription2021);
    expect(callSpy).toHaveBeenCalledTimes(1);
  });
  it('should call target onResourceDeleted.', async(): Promise<void> => {
    const callSpy = jest.spyOn(httpClient, 'call');
    await handler.onResourceDeleted({ path: 'webhook-url' }, {
      id: 'http%3A%2F%2Flocalhost%3A3000%2Fsource%2Ffoo%2F~~~0e9c66ab-d71a-459e-ab6e-8c8c84c8f617',
      type: 'WebHookSubscription2021',
      target: 'http://localhost:9999/webhook',
    } as WebHookSubscription2021);
    expect(callSpy).toHaveBeenCalledTimes(1);
  });
});
