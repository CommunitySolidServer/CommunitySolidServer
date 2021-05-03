import type { Provider } from 'oidc-provider';
import {
  RegistrationHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/RegistrationHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { InteractionCompleter } from '../../../../../../src/identity/interaction/util/InteractionCompleter';
import type { OwnershipValidator } from '../../../../../../src/identity/interaction/util/OwnershipValidator';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import { createPostFormRequest } from './Util';

describe('A RegistrationHandler', (): void => {
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
  let provider: Provider;
  let ownershipValidator: OwnershipValidator;
  let accountStore: AccountStore;
  let interactionCompleter: InteractionCompleter;
  let handler: RegistrationHandler;

  beforeEach(async(): Promise<void> => {
    provider = {
      interactionDetails: jest.fn().mockResolvedValue({ uid: '123456' }),
    } as any;

    ownershipValidator = {
      handleSafe: jest.fn(),
    } as any;

    accountStore = {
      create: jest.fn(),
    } as any;

    interactionCompleter = {
      handleSafe: jest.fn(),
    } as any;

    handler = new RegistrationHandler({
      ownershipValidator,
      accountStore,
      interactionCompleter,
    });
  });

  it('errors on non-string emails.', async(): Promise<void> => {
    request = createPostFormRequest({});
    await expect(handler.handle({ request, response, provider })).rejects.toThrow('Email required');
    request = createPostFormRequest({ email: [ 'email', 'email2' ]});
    await expect(handler.handle({ request, response, provider })).rejects.toThrow('Email required');
  });

  it('errors on invalid emails.', async(): Promise<void> => {
    request = createPostFormRequest({ email: 'invalidEmail' });
    const prom = handler.handle({ request, response, provider });
    await expect(prom).rejects.toThrow('Invalid email');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { }}));
  });

  it('errors on non-string webIds.', async(): Promise<void> => {
    request = createPostFormRequest({ email });
    let prom = handler.handle({ request, response, provider });
    await expect(prom).rejects.toThrow('WebId required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
    request = createPostFormRequest({ email, webId: [ 'a', 'b' ]});
    prom = handler.handle({ request, response, provider });
    await expect(prom).rejects.toThrow('WebId required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
  });

  it('errors on invalid passwords.', async(): Promise<void> => {
    request = createPostFormRequest({ email, webId, password: 'password!', confirmPassword: 'bad' });
    const prom = handler.handle({ request, response, provider });
    await expect(prom).rejects.toThrow('Password and confirmation do not match');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email, webId }}));
  });

  it('throws an IdpInteractionError if there is a problem.', async(): Promise<void> => {
    request = createPostFormRequest({ email, webId, password: 'password!', confirmPassword: 'password!' });
    (accountStore.create as jest.Mock).mockRejectedValueOnce(new Error('create failed!'));
    const prom = handler.handle({ request, response, provider });
    await expect(prom).rejects.toThrow('create failed!');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email, webId }}));
  });

  it('calls the OidcInteractionCompleter when done.', async(): Promise<void> => {
    request = createPostFormRequest({ email, webId, password: 'password!', confirmPassword: 'password!' });
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(accountStore.create).toHaveBeenCalledTimes(1);
    expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, 'password!');
    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionCompleter.handleSafe)
      .toHaveBeenLastCalledWith({ request, response, provider, webId, shouldRemember: false });
  });
});
