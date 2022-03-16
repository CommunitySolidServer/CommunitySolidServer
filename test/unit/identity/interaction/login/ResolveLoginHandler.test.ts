import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { AccountIdRoute } from '../../../../../src/identity/interaction/account/AccountIdRoute';
import type { CookieStore } from '../../../../../src/identity/interaction/account/util/CookieStore';
import type { JsonRepresentation } from '../../../../../src/identity/interaction/InteractionUtil';
import { ACCOUNT_PROMPT } from '../../../../../src/identity/interaction/InteractionUtil';
import type { JsonInteractionHandlerInput } from '../../../../../src/identity/interaction/JsonInteractionHandler';
import type { LoginOutputType } from '../../../../../src/identity/interaction/login/ResolveLoginHandler';
import {
  ResolveLoginHandler,
} from '../../../../../src/identity/interaction/login/ResolveLoginHandler';
import { CONTENT_TYPE, CONTENT_TYPE_TERM, SOLID_HTTP } from '../../../../../src/util/Vocabularies';

const accountId = 'accountId';
let output: JsonRepresentation<LoginOutputType>;
class DummyLoginHandler extends ResolveLoginHandler {
  public constructor(cookieStore: CookieStore, accountRoute: AccountIdRoute) {
    super(cookieStore, accountRoute);
  }

  public async login(): Promise<JsonRepresentation<LoginOutputType>> {
    return output;
  }
}

describe('A ResolveLoginHandler', (): void => {
  const cookie = 'cookie';
  let metadata: RepresentationMetadata;
  let input: JsonInteractionHandlerInput;
  let cookieStore: jest.Mocked<CookieStore>;
  let accountRoute: AccountIdRoute;
  let handler: DummyLoginHandler;

  beforeEach(async(): Promise<void> => {
    input = {
      json: {},
      metadata: new RepresentationMetadata(),
      target: { path: 'http://example.com/' },
      method: 'POST',
    };

    metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    output = {
      json: { accountId, data: 'data' } as LoginOutputType,
      metadata,
    };

    cookieStore = {
      generate: jest.fn().mockResolvedValue(cookie),
    } as any;

    accountRoute = {
      getPath: jest.fn().mockReturnValue('http://example.com/foo'),
      matchPath: jest.fn().mockReturnValue(true),
    };

    handler = new DummyLoginHandler(cookieStore, accountRoute);
  });

  it('removes the ID from the output and adds a cookie.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toEqual({ json: {
      data: 'data',
      cookie,
      resource: 'http://example.com/foo',
    },
    metadata });
    expect(metadata.get(SOLID_HTTP.terms.accountCookie)?.value).toBe(cookie);

    expect(cookieStore.generate).toHaveBeenCalledTimes(1);
    expect(cookieStore.generate).toHaveBeenLastCalledWith(accountId);
  });

  it('generates a metadata object if the login handler did not provide one.', async(): Promise<void> => {
    output = { json: { accountId, data: 'data' } as LoginOutputType };
    const result = await handler.handle(input);
    expect(result).toEqual({ json: {
      data: 'data',
      cookie,
      resource: 'http://example.com/foo',
    },
    metadata: expect.any(RepresentationMetadata) });
    expect(result.metadata).not.toBe(metadata);
    expect(result.metadata?.get(CONTENT_TYPE_TERM)).toBeUndefined();
  });

  it('adds a location field if there is an OIDC interaction.', async(): Promise<void> => {
    input.oidcInteraction = {
      lastSubmission: { login: { accountId: 'id' }},
      save: jest.fn(),
      returnTo: 'returnTo',
    } as any;
    await expect(handler.handle(input)).resolves.toEqual({ json: {
      data: 'data',
      cookie,
      resource: 'http://example.com/foo',
      location: 'returnTo',
    },
    metadata });

    expect(input.oidcInteraction!.save).toHaveBeenCalledTimes(1);
    expect(input.oidcInteraction!.result).toEqual({
      login: { accountId: 'id' },
      [ACCOUNT_PROMPT]: accountId,
    });
  });
});
