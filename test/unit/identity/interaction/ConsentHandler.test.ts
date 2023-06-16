import type { ProviderFactory } from '../../../../src/identity/configuration/ProviderFactory';
import { ConsentHandler } from '../../../../src/identity/interaction/ConsentHandler';
import type { Interaction } from '../../../../src/identity/interaction/InteractionHandler';
import { FoundHttpError } from '../../../../src/util/errors/FoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { readJsonStream } from '../../../../src/util/StreamUtil';
import type Provider from '../../../../templates/types/oidc-provider';
import { createPostJsonOperation } from './email-password/handler/Util';

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
  const clientMetadata = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    client_id: 'clientId',
  };
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
        save: jest.fn(),
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      params: { client_id: clientId },
      prompt: { details: {}},
      save: jest.fn(),
    } as any;

    knownGrant = new DummyGrant({ accountId, clientId });

    grantFn = jest.fn((props): DummyGrant => new DummyGrant(props)) as any;
    grantFn.find = jest.fn((grantId: string): any => grantId ? knownGrant : undefined);
    provider = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Grant: grantFn,
      Client: {
        find: (id: string): any => (id ? { metadata: jest.fn().mockReturnValue(clientMetadata) } : undefined),
      },
      Session: {
        find: (): Interaction['session'] => oidcInteraction.session,
      },
      /* eslint-enable @typescript-eslint/naming-convention */
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    handler = new ConsentHandler(providerFactory);
  });

  it('errors if no oidcInteraction is defined on POST requests.', async(): Promise<void> => {
    const error = expect.objectContaining({
      statusCode: 400,
      message: 'This action can only be performed as part of an OIDC authentication flow.',
      errorCode: 'E0002',
    });
    await expect(handler.canHandle({ operation: createPostJsonOperation({}) })).rejects.toThrow(error);

    await expect(handler.canHandle({ operation: createPostJsonOperation({}), oidcInteraction }))
      .resolves.toBeUndefined();
  });

  it('returns the client metadata on a GET request.', async(): Promise<void> => {
    const operation = { method: 'GET', target: { path: 'http://example.com/foo' }} as any;
    const representation = await handler.handle({ operation, oidcInteraction });
    await expect(readJsonStream(representation.data)).resolves.toEqual({
      client: {
        ...clientMetadata,
        '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',
      },
      webId: accountId,
    });
  });

  it('returns an empty object if no client was found.', async(): Promise<void> => {
    delete oidcInteraction.params.client_id;
    const operation = { method: 'GET', target: { path: 'http://example.com/foo' }} as any;
    const representation = await handler.handle({ operation, oidcInteraction });
    await expect(readJsonStream(representation.data)).resolves.toEqual({
      client: {
        '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',
      },
      webId: accountId,
    });
  });

  it('requires an oidcInteraction with a defined session.', async(): Promise<void> => {
    oidcInteraction.session = undefined;
    await expect(handler.handle({ operation: createPostJsonOperation({}), oidcInteraction }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('throws a redirect error.', async(): Promise<void> => {
    const operation = createPostJsonOperation({});
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(FoundHttpError);
  });

  it('stores the requested scopes and claims in the grant.', async(): Promise<void> => {
    oidcInteraction.prompt.details = {
      missingOIDCScope: [ 'scope1', 'scope2' ],
      missingOIDCClaims: [ 'claim1', 'claim2' ],
      missingResourceScopes: { resource: [ 'scope1', 'scope2' ]},
    };

    const operation = createPostJsonOperation({ remember: true });
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(FoundHttpError);
    expect(grantFn.mock.results).toHaveLength(1);
    expect(grantFn.mock.results[0].value.scopes).toEqual([ 'scope1 scope2' ]);
    expect(grantFn.mock.results[0].value.claims).toEqual([ 'claim1', 'claim2' ]);
    expect(grantFn.mock.results[0].value.resourceScopes).toEqual({ resource: 'scope1 scope2' });
    expect(grantFn.mock.results[0].value.rejectedScopes).toEqual([]);
  });

  it('creates a new Grant when needed.', async(): Promise<void> => {
    const operation = createPostJsonOperation({});
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(FoundHttpError);
    expect(grantFn).toHaveBeenCalledTimes(1);
    expect(grantFn).toHaveBeenLastCalledWith({ accountId, clientId });
    expect(grantFn.find).toHaveBeenCalledTimes(0);
  });

  it('reuses existing Grant objects.', async(): Promise<void> => {
    const operation = createPostJsonOperation({});
    oidcInteraction.grantId = '123456';
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(FoundHttpError);
    expect(grantFn).toHaveBeenCalledTimes(0);
    expect(grantFn.find).toHaveBeenCalledTimes(1);
    expect(grantFn.find).toHaveBeenLastCalledWith('123456');
  });

  it('rejectes offline_access as scope if a user does not want to be remembered.', async(): Promise<void> => {
    const operation = createPostJsonOperation({});
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(FoundHttpError);
    expect(grantFn.mock.results).toHaveLength(1);
    expect(grantFn.mock.results[0].value.rejectedScopes).toEqual([ 'offline_access' ]);
  });

  it('deletes the accountId when logout is provided.', async(): Promise<void> => {
    const operation = createPostJsonOperation({ logOut: true });
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(FoundHttpError);
    expect((oidcInteraction!.session! as any).save).toHaveBeenCalledTimes(1);
    expect(oidcInteraction!.session!.accountId).toBeUndefined();
  });
});
