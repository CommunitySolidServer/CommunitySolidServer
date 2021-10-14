import type {
  InteractionHandlerInput,
} from '../../../../../../src/identity/interaction/email-password/handler/InteractionHandler';
import { LoginHandler } from '../../../../../../src/identity/interaction/email-password/handler/LoginHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import { createPostJsonOperation } from './Util';

describe('A LoginHandler', (): void => {
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  let input: InteractionHandlerInput;
  let accountStore: jest.Mocked<AccountStore>;
  let handler: LoginHandler;

  beforeEach(async(): Promise<void> => {
    input = {} as any;

    accountStore = {
      authenticate: jest.fn().mockResolvedValue(webId),
      getSettings: jest.fn().mockResolvedValue({ useIdp: true }),
    } as any;

    handler = new LoginHandler(accountStore);
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
    await expect(handler.handle(input)).rejects.toThrow('This server is not an identity provider for this account.');
  });

  it('returns an InteractionCompleteResult when done.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ email, password: 'password!' });
    await expect(handler.handle(input)).resolves.toEqual({
      type: 'complete',
      details: { webId, shouldRemember: false },
    });
    expect(accountStore.authenticate).toHaveBeenCalledTimes(1);
    expect(accountStore.authenticate).toHaveBeenLastCalledWith(email, 'password!');
  });
});
