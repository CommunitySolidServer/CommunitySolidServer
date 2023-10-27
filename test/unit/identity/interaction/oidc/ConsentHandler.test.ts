import type { ProviderFactory } from '../../../../../src/identity/configuration/ProviderFactory';
import type { Interaction } from '../../../../../src/identity/interaction/InteractionHandler';
import { ConsentHandler } from '../../../../../src/identity/interaction/oidc/ConsentHandler';
import { FoundHttpError } from '../../../../../src/util/errors/FoundHttpError';
import { NotImplementedHttpError } from '../../../../../src/util/errors/NotImplementedHttpError';
import type Provider from '../../../../../templates/types/oidc-provider';

const newGrantId = 'newGrantId';
class DummyGrant {
  public accountId: string;
  public clientId: string;

  public readonly scopes: string[] = [];
  public claims: string[] = [];
  public readonly rejectedScopes: string[] = [];
  public readonly resourceScopes: Record<string, string> = {};

  public constructor(props: { accountId: string; clientId: string }) {
    this.accountId = props.accountId;
    this.clientId = props.clientId;
  }

  public rejectOIDCScope(scope: string): void {
    this.rejectedScopes.push(scope);
  }

  public addOIDCScope(scope: string): void {
    this.scopes.push(scope);
  }

  public addOIDCClaims(claims: string[]): void {
    this.claims = claims;
  }

  public addResourceScope(resource: string, scope: string): void {
    this.resourceScopes[resource] = scope;
  }

  public async save(): Promise<string> {
    return newGrantId;
  }
}

describe('A ConsentHandler', (): void => {
  const accountId = 'http://example.com/id#me';
  const clientId = 'clientId';
  let grantFn: jest.Mock<DummyGrant> & { find: jest.Mock<DummyGrant> };
  let knownGrant: DummyGrant;
  let oidcInteraction: Interaction;
  let provider: jest.Mocked<Provider>;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let handler: ConsentHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      session: {
        accountId,
        persist: jest.fn(),
      },

      params: { client_id: clientId },
      prompt: { details: {}},
      persist: jest.fn(),
    } as any;

    knownGrant = new DummyGrant({ accountId, clientId });

    grantFn = jest.fn((props): DummyGrant => new DummyGrant(props)) as any;
    // eslint-disable-next-line jest/prefer-spy-on
    grantFn.find = jest.fn((grantId: string): any => grantId ? knownGrant : undefined);
    provider = {
      Grant: grantFn,
      Session: {
        find: (): unknown => oidcInteraction.session,
      },
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    handler = new ConsentHandler(providerFactory);
  });

  it('errors if no oidcInteraction is defined.', async(): Promise<void> => {
    const error = expect.objectContaining({
      statusCode: 400,
      message: 'This action can only be performed as part of an OIDC authentication flow.',
      errorCode: 'E0002',
    });
    await expect(handler.handle({ json: {}} as any)).rejects.toThrow(error);
  });

  it('requires an oidcInteraction with a defined session.', async(): Promise<void> => {
    oidcInteraction.session = undefined;
    await expect(handler.handle({ json: {}, oidcInteraction } as any))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('throws a redirect error.', async(): Promise<void> => {
    await expect(handler.handle({ json: {}, oidcInteraction } as any)).rejects.toThrow(FoundHttpError);
  });

  it('stores the requested scopes and claims in the grant.', async(): Promise<void> => {
    oidcInteraction.prompt.details = {
      missingOIDCScope: [ 'scope1', 'scope2' ],
      missingOIDCClaims: [ 'claim1', 'claim2' ],
      missingResourceScopes: { resource: [ 'scope1', 'scope2' ]},
    };

    await expect(handler.handle({ json: { remember: true }, oidcInteraction } as any)).rejects.toThrow(FoundHttpError);
    expect(grantFn.mock.results).toHaveLength(1);
    expect(grantFn.mock.results[0].value.scopes).toEqual([ 'scope1 scope2' ]);
    expect(grantFn.mock.results[0].value.claims).toEqual([ 'claim1', 'claim2' ]);
    expect(grantFn.mock.results[0].value.resourceScopes).toEqual({ resource: 'scope1 scope2' });
    expect(grantFn.mock.results[0].value.rejectedScopes).toEqual([]);
  });

  it('creates a new Grant when needed.', async(): Promise<void> => {
    await expect(handler.handle({ json: {}, oidcInteraction } as any)).rejects.toThrow(FoundHttpError);
    expect(grantFn).toHaveBeenCalledTimes(1);
    expect(grantFn).toHaveBeenLastCalledWith({ accountId, clientId });
    expect(grantFn.find).toHaveBeenCalledTimes(0);
  });

  it('reuses existing Grant objects.', async(): Promise<void> => {
    oidcInteraction.grantId = '123456';
    await expect(handler.handle({ json: {}, oidcInteraction } as any)).rejects.toThrow(FoundHttpError);
    expect(grantFn).toHaveBeenCalledTimes(0);
    expect(grantFn.find).toHaveBeenCalledTimes(1);
    expect(grantFn.find).toHaveBeenLastCalledWith('123456');
  });

  it('rejects offline_access as scope if a user does not want to be remembered.', async(): Promise<void> => {
    await expect(handler.handle({ json: {}, oidcInteraction } as any)).rejects.toThrow(FoundHttpError);
    expect(grantFn.mock.results).toHaveLength(1);
    expect(grantFn.mock.results[0].value.rejectedScopes).toEqual([ 'offline_access' ]);
  });
});
