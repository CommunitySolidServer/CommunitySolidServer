import {
  EmailPasswordLoginHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordLoginHandler';
import type {
  EmailPasswordStore,
} from '../../../../../../src/identity/interaction/email-password/storage/EmailPasswordStore';
import type {
  IdpInteractionHttpHandlerInput,
} from '../../../../../../src/identity/interaction/IdpInteractionHttpHandler';
import type {
  OidcInteractionCompleter,
} from '../../../../../../src/identity/interaction/util/OidcInteractionCompleter';
import { createRequest } from './Util';

describe('EmailPasswordLoginHandler', (): void => {
  let input: IdpInteractionHttpHandlerInput;
  let emailPasswordStorageAdapter: EmailPasswordStore;
  let oidcInteractionCompleter: OidcInteractionCompleter;
  let handler: EmailPasswordLoginHandler;

  beforeEach(async(): Promise<void> => {
    input = {} as any;

    emailPasswordStorageAdapter = {
      authenticate: jest.fn().mockResolvedValue('webId!'),
    } as any;

    oidcInteractionCompleter = {
      handleSafe: jest.fn(),
    } as any;

    handler = new EmailPasswordLoginHandler({ emailPasswordStorageAdapter, oidcInteractionCompleter });
  });

  it('errors on invalid emails.', async(): Promise<void> => {
    input.request = createRequest({});
    let prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Email required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email: '' }}));
    input.request = createRequest({ email: [ 'a', 'b' ]});
    prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Email required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email: '' }}));
  });

  it('errors on invalid passwords.', async(): Promise<void> => {
    input.request = createRequest({ email: 'email!' });
    let prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Password required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email: 'email!' }}));
    input.request = createRequest({ email: 'email!', password: [ 'a', 'b' ]});
    prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Password required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email: 'email!' }}));
  });

  it('calls the OidcInteractionCompleter when done.', async(): Promise<void> => {
    input.request = createRequest({ email: 'email!', password: 'password!' });
    await expect(handler.handle(input)).resolves.toBeUndefined();
    expect(emailPasswordStorageAdapter.authenticate).toHaveBeenCalledTimes(1);
    expect(emailPasswordStorageAdapter.authenticate).toHaveBeenLastCalledWith('email!', 'password!');
    expect(oidcInteractionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(oidcInteractionCompleter.handleSafe)
      .toHaveBeenLastCalledWith({ ...input, webId: 'webId!', shouldRemember: false });
  });
});
