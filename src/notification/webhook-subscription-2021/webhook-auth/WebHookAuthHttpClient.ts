import type { RequestOptions, IncomingMessage } from 'http';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
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
}

export class WebHookAuthHttpClient implements HttpClient {
  private readonly jwksKeyGenerator: JwksKeyGenerator;
  private readonly baseUrl: string;

  public constructor(args: WebHookAuthHttpClientArgs) {
    this.jwksKeyGenerator = args.jwksKeyGenerator;
    this.baseUrl = args.baseUrl;
  }

  public call(
    url: string | URL,
    options: RequestOptions,
    data: any,
    callback?: ((res: IncomingMessage) => void) | undefined,
  ): void {
    const parsedUrl = url instanceof URL ? url : new URL(url);
    this.jwksKeyGenerator
      .getPrivateJwks(POD_JWKS_KEY)
      .then((jwks: { keys: any[] }): void => {
        const jwk = jwks.keys[0];
        if (!jwk) {
          throw new InternalServerError('No jwk available.');
        }
        importJWK(jwk, 'RS256')
          .then((jwkKeyLike): void => {
            const jwtRaw = {
              htu: parsedUrl.toString(),
              htm: 'POST',
            };
            new SignJWT(jwtRaw)
              .setProtectedHeader({ alg: 'RS256' })
              .setIssuedAt()
              .setIssuer(trimTrailingSlashes(this.baseUrl))
              .setExpirationTime('20m')
              .sign(jwkKeyLike)
              .then((signedJwt: string): void => {
                const augmentedOptions: RequestOptions = {
                  ...options,
                  headers: {
                    ...options.headers,
                    authorization: signedJwt,
                  },
                };
                const requestClient =
                  parsedUrl.protocol === 'https:' ? httpsRequest : httpRequest;

                const req = requestClient(
                  parsedUrl.toString(),
                  augmentedOptions,
                  callback,
                );
                req.write(data);
                req.end();
              })
              .catch((err: unknown): void => {
                throw err;
              });
          })
          .catch((err: unknown): void => {
            throw err;
          });
      })
      .catch((err: unknown): void => {
        throw err;
      });
  }
}
