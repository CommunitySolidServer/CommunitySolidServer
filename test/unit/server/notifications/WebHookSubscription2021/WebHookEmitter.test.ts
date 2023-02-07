import fetch from 'cross-fetch';
import { calculateJwkThumbprint, exportJWK, generateKeyPair, importJWK, jwtVerify } from 'jose';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../../src/http/representation/Representation';
import type { AlgJwk, JwkGenerator } from '../../../../../src/identity/configuration/JwkGenerator';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import type { Logger } from '../../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../../src/logging/LogUtil';
import type { Notification } from '../../../../../src/server/notifications/Notification';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import { WebHookEmitter } from '../../../../../src/server/notifications/WebHookSubscription2021/WebHookEmitter';
import type {
  WebHookFeatures,
} from '../../../../../src/server/notifications/WebHookSubscription2021/WebHookSubscription2021';
import { matchesAuthorizationScheme } from '../../../../../src/util/HeaderUtil';
import { trimTrailingSlashes } from '../../../../../src/util/PathUtil';

jest.mock('cross-fetch');

jest.mock('../../../../../src/logging/LogUtil', (): any => {
  const logger: Logger =
    { error: jest.fn(), debug: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A WebHookEmitter', (): void => {
  const fetchMock: jest.Mock = fetch as any;
  const baseUrl = 'http://example.com/';
  const webIdRoute = new AbsolutePathInteractionRoute('http://example.com/.notifcations/webhooks/webid');
  const notification: Notification = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://www.w3.org/ns/solid/notification/v1',
    ],
    id: `urn:123:http://example.com/foo`,
    type: 'Update',
    object: 'http://example.com/foo',
    published: '123',
  };
  let representation: Representation;
  const channel: NotificationChannel<WebHookFeatures> = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
    features: {
      target: 'http://example.org/somewhere-else',
      webId: webIdRoute.getPath(),
    },
    lastEmit: 0,
  };

  let privateJwk: AlgJwk;
  let publicJwk: AlgJwk;
  let jwkGenerator: jest.Mocked<JwkGenerator>;
  let emitter: WebHookEmitter;

  beforeEach(async(): Promise<void> => {
    fetchMock.mockResolvedValue({ status: 200 });

    representation = new BasicRepresentation(JSON.stringify(notification), 'application/ld+json');

    const { privateKey, publicKey } = await generateKeyPair('ES256');

    privateJwk = { ...await exportJWK(privateKey), alg: 'ES256' };
    publicJwk = { ...await exportJWK(publicKey), alg: 'ES256' };

    jwkGenerator = {
      alg: 'ES256',
      getPrivateKey: jest.fn().mockResolvedValue(privateJwk),
      getPublicKey: jest.fn().mockResolvedValue(publicJwk),
    };

    emitter = new WebHookEmitter(baseUrl, webIdRoute, jwkGenerator);
  });

  it('sends out the necessary data and headers.', async(): Promise<void> => {
    const now = Date.now();
    jest.useFakeTimers();
    jest.setSystemTime(now);
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe('http://example.org/somewhere-else');
    const { authorization, dpop, 'content-type': contentType } = call[1].headers;
    expect(contentType).toBe('application/ld+json');

    expect(matchesAuthorizationScheme('DPoP', authorization)).toBe(true);
    const encodedDpopToken = authorization.slice('DPoP '.length);

    const publicObject = await importJWK(publicJwk);

    // Check all the DPoP token fields
    const decodedDpopToken = await jwtVerify(encodedDpopToken, publicObject, { issuer: trimTrailingSlashes(baseUrl) });
    expect(decodedDpopToken.payload).toMatchObject({
      webid: channel.features.webId,
      azp: channel.features.webId,
      sub: channel.features.webId,
      cnf: { jkt: await calculateJwkThumbprint(publicJwk, 'sha256') },
      iat: now,
      exp: now + (20 * 60 * 1000),
      aud: [ channel.features.webId, 'solid' ],
      jti: expect.stringContaining('-'),
    });
    expect(decodedDpopToken.protectedHeader).toMatchObject({
      alg: 'ES256',
    });

    // CHeck the DPoP proof
    const decodedDpopProof = await jwtVerify(dpop, publicObject);
    expect(decodedDpopProof.payload).toMatchObject({
      htu: channel.features.target,
      htm: 'POST',
      iat: now,
      jti: expect.stringContaining('-'),
    });
    expect(decodedDpopProof.protectedHeader).toMatchObject({
      alg: 'ES256',
      typ: 'dpop+jwt',
      jwk: publicJwk,
    });

    jest.useRealTimers();
  });

  it('logs an error if the fetch request receives an invalid status code.', async(): Promise<void> => {
    const logger = getLoggerFor('mock');

    fetchMock.mockResolvedValue({ status: 400, text: async(): Promise<string> => 'invalid request' });
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(
      `There was an issue emitting a WebHook notification with target ${channel.features.target}: invalid request`,
    );
  });
});
