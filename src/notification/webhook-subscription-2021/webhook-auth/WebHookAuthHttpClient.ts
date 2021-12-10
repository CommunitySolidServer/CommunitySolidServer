import type { RequestOptions, IncomingMessage } from 'http';
import { request } from 'http';
import type { URL } from 'url';
// eslint-disable-next-line import/no-unresolved
import { SignJWT } from 'jose/jwt/sign';
import type { HttpClient } from '../../../http/client/HttpClient';
import type { JwksKeyGenerator } from '../../../identity/configuration/JwksKeyGenerator';
import { InternalServerError } from '../../../util/errors/InternalServerError';
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
    this.jwksKeyGenerator.getPrivateJwks(POD_JWKS_KEY).then((jwks: { keys: any[] }): void => {
      const jwk = jwks.keys[0];
      if (!jwk) {
        throw new InternalServerError('No jwk available.');
      }
      const expirationDate = new Date(Date.now() + (1000 * 60 * 20));
      const jwtRaw = {
        htu: url,
        htm: 'POST',
        iss: this.baseUrl,
        iat: new Date().getUTCDate(),
        exp: expirationDate.getUTCDate(),
      };
      new SignJWT(jwtRaw)
        .setIssuedAt(new Date().getUTCDate())
        .setIssuer(this.baseUrl)
        .setExpirationTime('20m')
        .sign(jwk)
        .then((signedJwt: string): void => {
          console.log('Signed JWT');
          console.log(signedJwt);
          const augmentedOptions: RequestOptions = {
            ...options,
            headers: {
              ...options.headers,
              authorization: signedJwt,
            },
          };

          const req = request(url, augmentedOptions, callback);
          req.write(data);
          req.end();
        })
        .catch((err: unknown): void => {
          throw err;
        });
    }).catch((err: unknown): void => {
      throw err;
    });
  }
}
