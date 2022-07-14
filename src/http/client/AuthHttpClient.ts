import type { RequestOptions, IncomingMessage } from 'http';
import { URL } from 'url';
import { importJWK, SignJWT } from 'jose';
import type { JwksKeyGenerator } from '../../identity/configuration/JwksKeyGenerator';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { trimTrailingSlashes } from '../../util/PathUtil';
import { POD_JWKS_KEY } from '../identity/PodJwksHttpHandler';
import type { HttpClient } from './HttpClient';

export class AuthHttpClient implements HttpClient {
  public constructor(
    private readonly jwksKeyGenerator: JwksKeyGenerator,
    private readonly baseUrl: string,
    private readonly httpClient: HttpClient,
  ) { }

  public async call(url: string | URL, options: RequestOptions, data: any): Promise<IncomingMessage> {
    if (!options.method) {
      throw new InternalServerError('HTTP method not specified.');
    }
    const parsedUrl = url instanceof URL ? url : new URL(url);
    const jwks = await this.jwksKeyGenerator.getPrivateJwks(POD_JWKS_KEY);
    if (!jwks || jwks.keys.length === 0) {
      throw new InternalServerError('No jwk available.');
    }
    const jwk = jwks.keys[0];
    const jwkKeyLike = await importJWK(jwk, 'RS256');
    const signJwt = new SignJWT({
      htu: parsedUrl.toString(),
      htm: options.method,
    });
    const signedJwt = await signJwt
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(trimTrailingSlashes(this.baseUrl))
      .setExpirationTime('20m')
      .sign(jwkKeyLike);
    const augmentedOptions: RequestOptions = {
      ...options,
      headers: {
        ...options.headers,
        authorization: signedJwt,
      },
    };
    return this.httpClient.call(parsedUrl, augmentedOptions, data);
  }
}
