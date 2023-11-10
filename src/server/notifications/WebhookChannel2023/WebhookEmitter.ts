import fetch from 'cross-fetch';
import { calculateJwkThumbprint, importJWK, SignJWT } from 'jose';
import { v4 } from 'uuid';
import type { JwkGenerator } from '../../../identity/configuration/JwkGenerator';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { NotImplementedHttpError } from '../../../util/errors/NotImplementedHttpError';
import { trimTrailingSlashes } from '../../../util/PathUtil';
import { readableToString } from '../../../util/StreamUtil';
import type { NotificationEmitterInput } from '../NotificationEmitter';
import { NotificationEmitter } from '../NotificationEmitter';
import type { WebhookChannel2023 } from './WebhookChannel2023Type';
import { isWebhook2023Channel } from './WebhookChannel2023Type';

/**
 * Emits a notification representation using the WebhookChannel2023 specification.
 *
 * At the time of writing it is not specified how exactly a notification sender should make its requests verifiable,
 * so for now we use a token similar to those from Solid-OIDC, signed by the server itself.
 *
 * Generates a DPoP token and proof, and adds those to the HTTP request that is sent to the target.
 *
 * The `expiration` input parameter is how long the generated token should be valid in minutes.
 * Default is 20.
 */
export class WebhookEmitter extends NotificationEmitter {
  protected readonly logger = getLoggerFor(this);

  private readonly issuer: string;
  private readonly webId: string;
  private readonly jwkGenerator: JwkGenerator;
  private readonly expiration: number;

  public constructor(baseUrl: string, webIdRoute: InteractionRoute, jwkGenerator: JwkGenerator, expiration = 20) {
    super();
    this.issuer = trimTrailingSlashes(baseUrl);
    this.webId = webIdRoute.getPath();
    this.jwkGenerator = jwkGenerator;
    this.expiration = expiration * 60 * 1000;
  }

  public async canHandle({ channel }: NotificationEmitterInput): Promise<void> {
    if (!isWebhook2023Channel(channel)) {
      throw new NotImplementedHttpError(`${channel.id} is not a WebhookChannel2023 channel.`);
    }
  }

  public async handle({ channel, representation }: NotificationEmitterInput): Promise<void> {
    // Cast was checked in `canHandle`
    const webhookChannel = channel as WebhookChannel2023;
    this.logger.debug(`Emitting Webhook notification with target ${webhookChannel.sendTo}`);

    const privateKey = await this.jwkGenerator.getPrivateKey();
    const publicKey = await this.jwkGenerator.getPublicKey();

    const privateKeyObject = await importJWK(privateKey);

    // Make sure both header and proof have the same timestamp
    const time = Date.now();

    // Currently the spec does not define how the notification sender should identify.
    // The format used here has been chosen to be similar
    // to how ID tokens are described in the Solid-OIDC specification for consistency.
    const dpopToken = await new SignJWT({
      webid: this.webId,
      azp: this.webId,
      sub: this.webId,
      cnf: {
        jkt: await calculateJwkThumbprint(publicKey, 'sha256'),
      },
    }).setProtectedHeader({ alg: privateKey.alg })
      .setIssuedAt(time)
      .setExpirationTime(time + this.expiration)
      .setAudience([ this.webId, 'solid' ])
      .setIssuer(this.issuer)
      .setJti(v4())
      .sign(privateKeyObject);

    // https://datatracker.ietf.org/doc/html/draft-ietf-oauth-dpop#section-4.2
    const dpopProof = await new SignJWT({
      htu: webhookChannel.sendTo,
      htm: 'POST',
    }).setProtectedHeader({ alg: privateKey.alg, jwk: publicKey, typ: 'dpop+jwt' })
      .setIssuedAt(time)
      .setJti(v4())
      .sign(privateKeyObject);

    const response = await fetch(webhookChannel.sendTo, {
      method: 'POST',
      headers: {
        // eslint-disable-next-line ts/naming-convention
        'content-type': representation.metadata.contentType!,
        authorization: `DPoP ${dpopToken}`,
        dpop: dpopProof,
      },
      body: await readableToString(representation.data),
    });
    if (response.status >= 400) {
      this.logger.error(`There was an issue emitting a Webhook notification with target ${webhookChannel.sendTo}: ${
        await response.text()}`);
    }
  }
}
