import { LoginHandler } from '../../../../../../src/identity/interaction/email-password/handler/LoginHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { InteractionHttpHandlerInput } from '../../../../../../src/identity/interaction/InteractionHttpHandler';
import type { InteractionCompleter } from '../../../../../../src/identity/interaction/util/InteractionCompleter';
import { createPostFormRequest } from './Util';

describe('A LoginHandler', (): void => {
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  let input: InteractionHttpHandlerInput;
  let storageAdapter: AccountStore;
  let interactionCompleter: InteractionCompleter;
  let handler: LoginHandler;

  beforeEach(async(): Promise<void> => {
    input = {} as any;

    storageAdapter = {
      authenticate: jest.fn().mockResolvedValue(webId),
    } as any;

    interactionCompleter = {
      handleSafe: jest.fn(),
    } as any;

    handler = new LoginHandler({ accountStore: storageAdapter, interactionCompleter });
  });

  it('errors on invalid emails.', async(): Promise<void> => {
    input.request = createPostFormRequest({});
    let prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Email required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: {}}));
    input.request = createPostFormRequest({ email: [ 'a', 'b' ]});
    prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Email required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { }}));
  });

  it('errors on invalid passwords.', async(): Promise<void> => {
    input.request = createPostFormRequest({ email });
    let prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Password required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
    input.request = createPostFormRequest({ email, password: [ 'a', 'b' ]});
    prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Password required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
  });

  it('throws an IdpInteractionError if there is a problem.', async(): Promise<void> => {
    input.request = createPostFormRequest({ email, password: 'password!' });
    (storageAdapter.authenticate as jest.Mock).mockRejectedValueOnce(new Error('auth failed!'));
    const prom = handler.handle(input);
    await expect(prom).rejects.toThrow('auth failed!');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
  });

  it('calls the OidcInteractionCompleter when done.', async(): Promise<void> => {
    input.request = createPostFormRequest({ email, password: 'password!' });
    await expect(handler.handle(input)).resolves.toBeUndefined();
    expect(storageAdapter.authenticate).toHaveBeenCalledTimes(1);
    expect(storageAdapter.authenticate).toHaveBeenLastCalledWith(email, 'password!');
    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionCompleter.handleSafe)
      .toHaveBeenLastCalledWith({ ...input, webId, shouldRemember: false });
  });
});
