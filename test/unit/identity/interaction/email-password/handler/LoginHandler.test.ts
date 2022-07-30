import { LoginHandler } from '../../../../../../src/identity/interaction/email-password/handler/LoginHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type {
  Interaction,
  InteractionHandlerInput,
} from '../../../../../../src/identity/interaction/InteractionHandler';
import { FoundHttpError } from '../../../../../../src/util/errors/FoundHttpError';
import { createPostJsonOperation } from './Util';

describe('A LoginHandler', (): void => {
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  let oidcInteraction: jest.Mocked<Interaction>;
  let input: Required<InteractionHandlerInput>;
  let accountStore: jest.Mocked<AccountStore>;
  let handler: LoginHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      exp: 123456,
      save: jest.fn(),
    } as any;

    input = { oidcInteraction } as any;

    accountStore = {
      authenticate: jest.fn().mockResolvedValue(webId),
      getSettings: jest.fn().mockResolvedValue({ useIdp: true }),
    } as any;

    handler = new LoginHandler(accountStore);
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

  it('errors on invalid emails.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({});
    await expect(handler.handle(input)).rejects.toThrow('Email required');
    input.operation = createPostJsonOperation({ email: [ 'a', 'b' ]});
    await expect(handler.handle(input)).rejects.toThrow('Email required');
  });

  it('errors on invalid passwords.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ email });
    await expect(handler.handle(input)).rejects.toThrow('Password required');
    input.operation = createPostJsonOperation({ email, password: [ 'a', 'b' ]});
    await expect(handler.handle(input)).rejects.toThrow('Password required');
  });

  it('throws an error if there is a problem.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ email, password: 'password!' });
    accountStore.authenticate.mockRejectedValueOnce(new Error('auth failed!'));
    await expect(handler.handle(input)).rejects.toThrow('auth failed!');
  });

  it('throws an error if the account does not have the correct settings.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ email, password: 'password!' });
    accountStore.getSettings.mockResolvedValueOnce({ useIdp: false, clientCredentials: []});
    await expect(handler.handle(input))
      .rejects.toThrow('This server is not an identity provider for this account.');
  });

  it('returns the generated redirect URL.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ email, password: 'password!' });
    await expect(handler.handle(input)).rejects.toThrow(FoundHttpError);

    expect(accountStore.authenticate).toHaveBeenCalledTimes(1);
    expect(accountStore.authenticate).toHaveBeenLastCalledWith(email, 'password!');
    expect(oidcInteraction.save).toHaveBeenCalledTimes(1);
    expect(oidcInteraction.result).toEqual({
      login: { accountId: webId, remember: false },
      hasAskedToSwitchAccount: true,
    });
  });
});
