import type { interactionPolicy, Configuration, KoaContextWithOIDC } from 'oidc-provider';
import type { ConfigurationFactory } from '../../../src/identity/configuration/ConfigurationFactory';
import { IdentityProviderFactory } from '../../../src/identity/IdentityProviderFactory';
import type { InteractionPolicy } from '../../../src/identity/interaction/InteractionPolicy';
import type { ResponseWriter } from '../../../src/ldp/http/ResponseWriter';

jest.mock('oidc-provider', (): any => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Provider: jest.fn().mockImplementation((issuer: string, config: Configuration): any => ({ issuer, config })),
}));

describe('An IdentityProviderFactory', (): void => {
  const issuer = 'http://test.com/';
  const idpPolicy: InteractionPolicy = {
    policy: [ 'prompt' as unknown as interactionPolicy.Prompt ],
    url: (ctx: KoaContextWithOIDC): string => `/idp/interaction/${ctx.oidc.uid}`,
  };
  const webId = 'http://alice.test.com/card#me';
  let configuration: any;
  let errorResponseWriter: ResponseWriter;
  let factory: IdentityProviderFactory;

  beforeEach(async(): Promise<void> => {
    configuration = {};
    const configurationFactory: ConfigurationFactory = {
      createConfiguration: async(): Promise<any> => configuration,
    };

    errorResponseWriter = {
      handleSafe: jest.fn(),
    } as any;

    factory = new IdentityProviderFactory(issuer, configurationFactory, errorResponseWriter);
  });

  it('has fixed default values.', async(): Promise<void> => {
    const result = await factory.createProvider(idpPolicy) as any;
    expect(result.issuer).toBe(issuer);
    expect(result.config.interactions).toEqual(idpPolicy);

    const findResult = await result.config.findAccount({}, webId);
    expect(findResult.accountId).toBe(webId);
    await expect(findResult.claims()).resolves.toEqual({ sub: webId, webid: webId });

    expect(result.config.claims).toEqual({ webid: [ 'webid', 'client_webid' ]});
    expect(result.config.conformIdTokenClaims).toBe(false);
    expect(result.config.features).toEqual({
      registration: { enabled: true },
      dPoP: { enabled: true, ack: 'draft-01' },
      claimsParameter: { enabled: true },
    });
    expect(result.config.subjectTypes).toEqual([ 'public', 'pairwise' ]);
    expect(result.config.formats).toEqual({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      AccessToken: 'jwt',
    });
    expect(result.config.audiences()).toBe('solid');

    expect(result.config.extraAccessTokenClaims({}, {})).toEqual({});
    expect(result.config.extraAccessTokenClaims({}, { accountId: webId })).toEqual({
      webid: webId,
      // This will need to change once #718 is fixed
      // eslint-disable-next-line @typescript-eslint/naming-convention
      client_webid: 'http://localhost:3001/',
      aud: 'solid',
    });

    await expect(result.config.renderError({ res: 'response!' }, null, 'error!')).resolves.toBeUndefined();
    expect(errorResponseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorResponseWriter.handleSafe).toHaveBeenLastCalledWith({ response: 'response!', result: 'error!' });
  });

  it('overwrites fields from the factory config.', async(): Promise<void> => {
    configuration.dummy = 'value!';
    configuration.conformIdTokenClaims = true;
    const result = await factory.createProvider(idpPolicy) as any;
    expect(result.config.dummy).toBe('value!');
    expect(result.config.conformIdTokenClaims).toBe(false);
  });

  it('copies specific object values from the factory config.', async(): Promise<void> => {
    configuration.interactions = { dummy: 'interaction!' };
    configuration.claims = { dummy: 'claim!' };
    configuration.features = { dummy: 'feature!' };
    configuration.subjectTypes = [ 'dummy!' ];
    configuration.formats = { dummy: 'format!' };

    const result = await factory.createProvider({ policy: 'policy!', url: 'url!' } as any) as any;
    expect(result.config.interactions).toEqual({ policy: 'policy!', url: 'url!' });
    expect(result.config.claims).toEqual({ dummy: 'claim!', webid: [ 'webid', 'client_webid' ]});
    expect(result.config.features).toEqual({
      dummy: 'feature!',
      registration: { enabled: true },
      dPoP: { enabled: true, ack: 'draft-01' },
      claimsParameter: { enabled: true },
    });
    expect(result.config.subjectTypes).toEqual([ 'public', 'pairwise' ]);
    expect(result.config.formats).toEqual({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      AccessToken: 'jwt',
    });
  });
});
