import { importJWK, jwtVerify } from 'jose';
import type {
  KoaContextWithOIDC,
} from '../../../templates/types/oidc-provider';
import { importCheckResource, importDpopValidate } from '../IdentityUtil';
import type { JwkGenerator } from './JwkGenerator';

const epochTime = (date = Date.now()) => Math.floor(date / 1000);

export class JwtAssertionsGrantHandler {
  public constructor(
    private readonly jwkGenerator: JwkGenerator,
  ) {}

  public parameters = [
    'client_id',
    'scope',
    'assertion',
  ];

  public grantType = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

  public async handler(ctx: KoaContextWithOIDC) {
    const { ClientCredentials, ReplayDetection } = ctx.oidc.provider;
    const { client } = ctx.oidc;

    // Validate DPoP
    const dpopValidate = await importDpopValidate().default;
    const dPoP = await dpopValidate(ctx);
    // TODO
    // const unique = await ReplayDetection.unique(client!.clientId, dPoP.jti, epochTime() + 300);
    // ctx.assert(unique, new InvalidGrant('DPoP proof JWT Replay detected'));
    //
    const checkResource = await importCheckResource().default;
    await checkResource(ctx, () => {});

    // Validate assertion
    const assertion = ctx.oidc.params?.assertion;
    if (!assertion) {
      // TODO: set correct error resonse
      return;
    }
    const publicKey = await this.jwkGenerator.getPublicKey();
    const publicKeyObject = await importJWK(publicKey);

    // TODO: better handling of failure
    const assertedData = await jwtVerify(assertion as string, publicKeyObject);

    // Issue access_token
    const claims = {
      client: client!,
      scope: 'webid',
      extra: {
        webid: assertedData.payload.agent,
      },
    };
    const token = new ClientCredentials(claims);

    // @ts-expect-error
    token.setThumbprint('jkt', dPoP.thumbprint);
    token.resourceServer = Object.values(ctx.oidc.resourceServers!)[0];

    ctx.oidc.entity('ClientCredentials', token);
    const value = await token.save();

    ctx.body = {
      access_token: value,
      expires_in: token.expiration,
      token_type: token.tokenType,
      scope: token.scope || undefined,
    };
  }
}
