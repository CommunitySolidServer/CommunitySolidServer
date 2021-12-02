import { LoginHandler } from '../../../../../../src/identity/interaction/email-password/handler/LoginHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type {
  Interaction,
  InteractionHandlerInput,
} from '../../../../../../src/identity/interaction/InteractionHandler';
import type {
  InteractionCompleter,
} from '../../../../../../src/identity/interaction/util/InteractionCompleter';
import { FoundHttpError } from '../../../../../../src/util/errors/FoundHttpError';
import { createPostJsonOperation } from './Util';

describe('A LoginHandler', (): void => {
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  const oidcInteraction: Interaction = {} as any;
  let input: Required<InteractionHandlerInput>;
  let accountStore: jest.Mocked<AccountStore>;
  let interactionCompleter: jest.Mocked<InteractionCompleter>;
  let handler: LoginHandler;

  beforeEach(async(): Promise<void> => {
    input = { oidcInteraction } as any;

    accountStore = {
      authenticate: jest.fn().mockResolvedValue(webId),
      getSettings: jest.fn().mockResolvedValue({ useIdp: true }),
    } as any;

    interactionCompleter = {
      handleSafe: jest.fn().mockResolvedValue('http://test.com/redirect'),
    } as any;

    handler = new LoginHandler(accountStore, interactionCompleter);
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
    accountStore.getSettings.mockResolvedValueOnce({ useIdp: false });
    await expect(handler.handle(input))
      .rejects.toThrow('This server is not an identity provider for this account.');
  });

  it('returns the correct completion parameters.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ email, password: 'password!' });
    await expect(handler.handle(input)).rejects.toThrow(FoundHttpError);

    expect(accountStore.authenticate).toHaveBeenCalledTimes(1);
    expect(accountStore.authenticate).toHaveBeenLastCalledWith(email, 'password!');
    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionCompleter.handleSafe).toHaveBeenLastCalledWith({ oidcInteraction, webId, shouldRemember: false });
  });
});
