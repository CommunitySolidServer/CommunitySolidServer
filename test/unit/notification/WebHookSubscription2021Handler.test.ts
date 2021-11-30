/* eslint-disable func-style */
import { IncomingMessage } from 'http';
import type { IncomingHttpHeaders, RequestOptions } from 'http';
import { Socket } from 'net';
import type { HttpClient } from '../../../src/http/client/HttpClient';
import { WebHookSubscription2021Handler } from '../../../src/notification/WebHookSubscription2021Handler';

class MockSocket extends Socket {

}
class MockIncomingMessage extends IncomingMessage {
  public readonly statusCode: number;
  public readonly headers: IncomingHttpHeaders;
  public constructor(statusCode: number, headers: IncomingHttpHeaders, socket: Socket) {
    super(socket);
    this.statusCode = statusCode;
    this.headers = headers;
  }
}

class MockHttpClient implements HttpClient {
  private readonly socket = new MockSocket();
  public call(url: string | URL,
    options: RequestOptions,
    data: any,
    callback?: ((res: IncomingMessage) => void) | undefined): void {
    const res = new MockIncomingMessage(200, { header: 'ExampleHeader' }, this.socket);
    if (callback) {
      // eslint-disable-next-line callback-return
      callback(res);
    }
    res.emit('data', 'CHUNK');
    res.emit('end');
  }
}

describe('A WebHookSubscription2021Handler', (): void => {
  let httpClient: MockHttpClient;
  let handler: WebHookSubscription2021Handler;
  beforeEach(async(): Promise<void> => {
    httpClient = new MockHttpClient();
    handler = new WebHookSubscription2021Handler(httpClient);
  });

  it('shoud return the implemented notification type.', (): void => {
    const type = handler.getType();
    expect(type).toEqual('WebHookSubscription2021');
  });
  it('shoud return the expected subscription when subscribed to.', (): void => {
    const subscriptionRequest = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WebHookSubscription2021',
      topic: 'http://localhost:3000/source/foo/',
      target: 'http://localhost:9999/webhook',
    };
    const type = handler.subscribe(subscriptionRequest);
    expect(type).toEqual({
      type: 'WebHookSubscription2021',
      target: 'http://localhost:9999/webhook',
    });
  });
  it('shoud return the expected object when asked for response data.', (): void => {
    const reader = handler.getResponseData();
    const data = reader?.read();
    expect(data).toEqual(JSON.stringify(
      {
        '@context': 'https://www.w3.org/ns/solid/notification/v1',
        type: 'WebHookSubscription2021',
      },
    ));
  });
  it('shoud call target onResourceCreated.', async(): Promise<void> => {
    const callSpy = jest.spyOn(httpClient, 'call');
    await handler.onResourceCreated({ path: 'webhook-url' }, { type: 'dummy' });
    expect(callSpy).toHaveBeenCalledTimes(1);
  });
  it('shoud call target onResourceChanged.', async(): Promise<void> => {
    const callSpy = jest.spyOn(httpClient, 'call');
    await handler.onResourceChanged({ path: 'webhook-url' }, { type: 'dummy' });
    expect(callSpy).toHaveBeenCalledTimes(1);
  });
  it('shoud call target onResourceDeleted.', async(): Promise<void> => {
    const callSpy = jest.spyOn(httpClient, 'call');
    await handler.onResourceDeleted({ path: 'webhook-url' }, { type: 'dummy' });
    expect(callSpy).toHaveBeenCalledTimes(1);
    const aSecond: () => Promise<void> = async function(): Promise<void> {
      return new Promise<void>((resolve): void => {
        setTimeout((): void => resolve(), 1000);
      });
    };
    await aSecond();
  });
});
