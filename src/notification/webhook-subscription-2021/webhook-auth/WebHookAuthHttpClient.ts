import type { RequestOptions, IncomingMessage } from 'http';
import { URL } from 'url';
import { importJWK, SignJWT } from 'jose';
import type { HttpClient } from '../../../http/client/HttpClient';
import type { JwksKeyGenerator } from '../../../identity/configuration/JwksKeyGenerator';
import { InternalServerError } from '../../../util/errors/InternalServerError';
import { trimTrailingSlashes } from '../../../util/PathUtil';
import { POD_JWKS_KEY } from './PodJwksHttpHandler';

export interface WebHookAuthHttpClientArgs {
  jwksKeyGenerator: JwksKeyGenerator;
  baseUrl: string;
  httpClient: HttpClient;
}

export class WebHookAuthHttpClient implements HttpClient {
  private readonly jwksKeyGenerator: JwksKeyGenerator;
  private readonly baseUrl: string;
  private readonly httpClient: HttpClient;

  public constructor(args: WebHookAuthHttpClientArgs) {
    this.jwksKeyGenerator = args.jwksKeyGenerator;
    this.baseUrl = args.baseUrl;
    this.httpClient = args.httpClient;
  }

  public async call(
    url: string | URL,
    options: RequestOptions,
    data: any,
  ): Promise<IncomingMessage> {
    const parsedUrl = url instanceof URL ? url : new URL(url);
    const jwks = await this.jwksKeyGenerator.getPrivateJwks(POD_JWKS_KEY);
    const jwk = jwks.keys[0];
    if (!jwk) {
      throw new InternalServerError('No jwk available.');
    }
    const jwkKeyLike = await importJWK(jwk, 'RS256');
    const jwtRaw = {
      htu: parsedUrl.toString(),
      htm: 'POST',
    };
    const signJwt = new SignJWT(jwtRaw);
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
