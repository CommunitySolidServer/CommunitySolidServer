import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import type { AccountIdRoute } from '../../../../../src/identity/interaction/account/AccountIdRoute';
import type {
  JsonInteractionHandler,
  JsonInteractionHandlerInput,
} from '../../../../../src/identity/interaction/JsonInteractionHandler';
import { AuthorizedRouteHandler } from '../../../../../src/identity/interaction/routing/AuthorizedRouteHandler';
import { ForbiddenHttpError } from '../../../../../src/util/errors/ForbiddenHttpError';
import { UnauthorizedHttpError } from '../../../../../src/util/errors/UnauthorizedHttpError';

describe('An AuthorizedRouteHandler', (): void => {
  const accountId = 'accountId';
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };
  let input: JsonInteractionHandlerInput;
  let route: jest.Mocked<AccountIdRoute>;
  let source: jest.Mocked<JsonInteractionHandler>;
  let handler: AuthorizedRouteHandler;

  beforeEach(async(): Promise<void> => {
    input = {
      target,
      json: { data: 'data' },
      metadata: new RepresentationMetadata(),
      method: 'GET',
      accountId,
    };

    route = {
      matchPath: jest.fn().mockReturnValue({ accountId }),
      getPath: jest.fn(),
    };

    source = {
      handle: jest.fn().mockResolvedValue('response'),
    } as any;

    handler = new AuthorizedRouteHandler(route, source);
  });

  it('calls the source handler with the input.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe('response');
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
  });

  it('errors if there is no account ID in the input.', async(): Promise<void> => {
    delete input.accountId;
    await expect(handler.handle(input)).rejects.toThrow(UnauthorizedHttpError);
    expect(source.handle).toHaveBeenCalledTimes(0);
  });

  it('errors if the account ID does not match the route result.', async(): Promise<void> => {
    route.matchPath.mockReturnValueOnce({ accountId: 'otherId' });
    await expect(handler.handle(input)).rejects.toThrow(ForbiddenHttpError);
    expect(source.handle).toHaveBeenCalledTimes(0);
  });
});
