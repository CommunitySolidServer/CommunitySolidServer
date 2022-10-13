import fetch from 'cross-fetch';
import { calculateJwkThumbprint, importJWK, SignJWT } from 'jose';
import { v4 } from 'uuid';
import type { JwkGenerator } from '../../../identity/configuration/JwkGenerator';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import { trimTrailingSlashes } from '../../../util/PathUtil';
import { readableToString } from '../../../util/StreamUtil';
import type { NotificationEmitterInput } from '../NotificationEmitter';
import { NotificationEmitter } from '../NotificationEmitter';
import type { WebHookFeatures } from './WebHookSubscription2021';

/**
 * Emits a notification representation using the WebHookSubscription2021 specification.
 *
 * Generates a DPoP token and proof, and adds those to the HTTP request that is sent to the target.
 *
 * The `expiration` input parameter is how long the generated token should be valid in minutes.
 * Default is 20.
 */
export class WebHookEmitter extends NotificationEmitter<WebHookFeatures> {
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

  public async handle({ info, representation }: NotificationEmitterInput<WebHookFeatures>): Promise<void> {
    this.logger.debug(`Emitting WebHook notification with target ${info.features.target}`);

    const privateKey = await this.jwkGenerator.getPrivateKey();
    const publicKey = await this.jwkGenerator.getPublicKey();

    const privateKeyObject = await importJWK(privateKey);

    // Make sure both header and proof have the same timestamp
    const time = Date.now();

    // The spec is not completely clear on which fields actually need to be present in the token,
    // only that it needs to contain the WebID somehow.
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
      htu: info.features.target,
      htm: 'POST',
    }).setProtectedHeader({ alg: privateKey.alg, jwk: publicKey, typ: 'dpop+jwt' })
      .setIssuedAt(time)
      .setJti(v4())
      .sign(privateKeyObject);

    const response = await fetch(info.features.target, {
      method: 'POST',
      headers: {
        'content-type': representation.metadata.contentType!,
        authorization: `DPoP ${dpopToken}`,
        dpop: dpopProof,
      },
      body: await readableToString(representation.data),
    });
    if (response.status >= 400) {
      this.logger.error(`There was an issue emitting a WebHook notification with target ${info.features.target}: ${
        await response.text()}`);
    }
  }
}
