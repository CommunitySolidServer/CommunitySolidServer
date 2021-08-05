import type {
  InteractionHandlerInput,
} from '../../../../../../src/identity/interaction/email-password/handler/InteractionHandler';
import { LoginHandler } from '../../../../../../src/identity/interaction/email-password/handler/LoginHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import { createPostFormOperation } from './Util';

describe('A LoginHandler', (): void => {
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  let input: InteractionHandlerInput;
  let storageAdapter: AccountStore;
  let handler: LoginHandler;

  beforeEach(async(): Promise<void> => {
    input = {} as any;

    storageAdapter = {
      authenticate: jest.fn().mockResolvedValue(webId),
    } as any;

    handler = new LoginHandler(storageAdapter);
  });

  it('errors on invalid emails.', async(): Promise<void> => {
    input.operation = createPostFormOperation({});
    let prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Email required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: {}}));
    input.operation = createPostFormOperation({ email: [ 'a', 'b' ]});
    prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Email required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { }}));
  });

  it('errors on invalid passwords.', async(): Promise<void> => {
    input.operation = createPostFormOperation({ email });
    let prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Password required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
    input.operation = createPostFormOperation({ email, password: [ 'a', 'b' ]});
    prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Password required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
  });

  it('throws an IdpInteractionError if there is a problem.', async(): Promise<void> => {
    input.operation = createPostFormOperation({ email, password: 'password!' });
    (storageAdapter.authenticate as jest.Mock).mockRejectedValueOnce(new Error('auth failed!'));
    const prom = handler.handle(input);
    await expect(prom).rejects.toThrow('auth failed!');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
  });

  it('returns an InteractionCompleteResult when done.', async(): Promise<void> => {
    input.operation = createPostFormOperation({ email, password: 'password!' });
    await expect(handler.handle(input)).resolves.toEqual({
      type: 'complete',
      details: { webId, shouldRemember: false },
    });
    expect(storageAdapter.authenticate).toHaveBeenCalledTimes(1);
    expect(storageAdapter.authenticate).toHaveBeenLastCalledWith(email, 'password!');
  });
});
