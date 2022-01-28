/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { IncomingMessage } from 'http';
import { URL } from 'url';
import type { HttpClient } from '../../../../../src/http/client/HttpClient';
import type { JwksKeyGenerator } from '../../../../../src/identity/configuration/JwksKeyGenerator';
import { WebHookAuthHttpClient }
  from '../../../../../src/notification/webhook-subscription-2021/webhook-auth/WebHookAuthHttpClient';
import { InternalServerError } from '../../../../../src/util/errors/InternalServerError';

const sign = jest.fn(async(): Promise<string> => 'signed');
const produceJwt: any = {
  setProtectedHeader: jest.fn(() => produceJwt),
  setIssuedAt: jest.fn(() => produceJwt),
  setIssuer: jest.fn(() => produceJwt),
  setExpirationTime: jest.fn(() => produceJwt),
  sign,
};
jest.mock('jose', (): any => ({
  importJWK: jest.fn(async(jwk: string, alg: string): Promise<any> => Promise.resolve({ dummy: 'test' })),
  SignJWT: jest.fn().mockImplementation(() => produceJwt),
}));

describe('A WebHookAuthHttpClient', (): void => {
  const baseUrl = 'http://server/';

  it('throws error if no jwk provided by jwksKeyGenerator.', async(): Promise<void> => {
    const httpClient: HttpClient = jest.fn();
    const getPrivateJwks = jest.fn((keyName: string) => Promise.resolve({ keys: []}));
    const getPublicJwks = jest.fn();
    const jwksKeyGenerator: JwksKeyGenerator = {
      getPrivateJwks,
      getPublicJwks,
    };
    const webhookUrl = 'http://client/webhook';
    const options = { method: 'POST' };
    const webHookAuthHttpClient = new WebHookAuthHttpClient({
      jwksKeyGenerator,
      baseUrl,
      httpClient,
    });
    const promise = webHookAuthHttpClient.call(webhookUrl, options, {});

    expect(getPrivateJwks).toHaveBeenCalledTimes(1);
    expect(getPublicJwks).toHaveBeenCalledTimes(0);
    expect(httpClient).toHaveBeenCalledTimes(0);
    await expect(promise).rejects.toThrow(new InternalServerError('No jwk available.'));
  });
  it('throws error if no jwk provided by jwksKeyGenerator even when called with URL.', async(): Promise<void> => {
    const httpClient: HttpClient = jest.fn();
    const getPrivateJwks = jest.fn((keyName: string) => Promise.resolve({ keys: []}));
    const getPublicJwks = jest.fn();
    const jwksKeyGenerator: JwksKeyGenerator = {
      getPrivateJwks,
      getPublicJwks,
    };
    const webhookUrl = new URL('http://client/webhook');
    const options = { method: 'POST' };
    const webHookAuthHttpClient = new WebHookAuthHttpClient({
      jwksKeyGenerator,
      baseUrl,
      httpClient,
    });
    const promise = webHookAuthHttpClient.call(webhookUrl, options, {});

    expect(getPrivateJwks).toHaveBeenCalledTimes(1);
    expect(getPublicJwks).toHaveBeenCalledTimes(0);
    expect(httpClient).toHaveBeenCalledTimes(0);
    await expect(promise).rejects.toThrow(new InternalServerError('No jwk available.'));
  });
  it('sets signedJwt header and calls the client.', async(): Promise<void> => {
    const call = jest.fn((url: string | URL, options: any, data: any): Promise<IncomingMessage> => {
      const incomingMessage: any = {
        statusCode: 200,
      };
      return Promise.resolve(incomingMessage);
    });
    const httpClient: HttpClient = {
      call,
    };
    const getPrivateJwks = jest.fn((keyName: string) => Promise.resolve({ keys: [ 'privateKey' ]}));
    const getPublicJwks = jest.fn();
    const jwksKeyGenerator: JwksKeyGenerator = {
      getPrivateJwks,
      getPublicJwks,
    };
    const webhookUrl = 'http://client/webhook';
    const options = { method: 'POST' };
    const webHookAuthHttpClient = new WebHookAuthHttpClient({
      jwksKeyGenerator,
      baseUrl,
      httpClient,
    });
    const promise = webHookAuthHttpClient.call(webhookUrl, options, {});
    await expect(promise).resolves.toStrictEqual({ statusCode: 200 });
    expect(produceJwt.setProtectedHeader).toHaveBeenCalledWith({ alg: 'RS256' });
    expect(produceJwt.setIssuedAt).toHaveBeenCalledTimes(1);
    expect(produceJwt.setIssuer).toHaveBeenCalledWith('http://server');
    expect(produceJwt.setExpirationTime).toHaveBeenCalledWith('20m');
    expect(produceJwt.sign).toHaveBeenCalledWith({ dummy: 'test' });
    expect(call.mock.calls).toEqual(
      [[ new URL(webhookUrl), { method: 'POST', headers: { authorization: 'signed' }}, {}]],
    );
  });
});

