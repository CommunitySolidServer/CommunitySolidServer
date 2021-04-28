import type { Provider } from 'oidc-provider';
import {
  RegistrationHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/RegistrationHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { InteractionCompleter } from '../../../../../../src/identity/interaction/util/InteractionCompleter';
import type { OwnershipValidator } from '../../../../../../src/identity/interaction/util/OwnershipValidator';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import { createRequest } from './Util';

describe('A RegistrationHandler', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = 'response!' as any;
  let provider: Provider;
  let ownershipValidator: OwnershipValidator;
  let accountStore: AccountStore;
  let interactionCompleter: InteractionCompleter;
  let handler: RegistrationHandler;

  beforeEach(async(): Promise<void> => {
    provider = {
      interactionDetails: jest.fn().mockResolvedValue({ uid: 'uid!' }),
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
    request = createRequest({});
    await expect(handler.handle({ request, response, provider })).rejects.toThrow('Email required');
    request = createRequest({ email: [ 'email', 'email2' ]});
    await expect(handler.handle({ request, response, provider })).rejects.toThrow('Email required');
  });

  it('errors on invalid emails.', async(): Promise<void> => {
    request = createRequest({ email: 'invalidEmail' });
    const prom = handler.handle({ request, response, provider });
    await expect(prom).rejects.toThrow('Invalid email');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email: '', webId: '' }}));
  });

  it('errors on non-string webIds.', async(): Promise<void> => {
    request = createRequest({ email: 'test@test.com' });
    let prom = handler.handle({ request, response, provider });
    await expect(prom).rejects.toThrow('WebId required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email: 'test@test.com', webId: '' }}));
    request = createRequest({ email: 'test@test.com', webId: [ 'a', 'b' ]});
    prom = handler.handle({ request, response, provider });
    await expect(prom).rejects.toThrow('WebId required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email: 'test@test.com', webId: '' }}));
  });

  it('errors on invalid passwords.', async(): Promise<void> => {
    request = createRequest({ email: 'test@test.com', webId: 'webId!', password: 'password!', confirmPassword: 'bad' });
    const prom = handler.handle({ request, response, provider });
    await expect(prom).rejects.toThrow('Password and confirm password do not match');
    await expect(prom).rejects.toThrow(expect.objectContaining({
      prefilled: { email: 'test@test.com', webId: 'webId!' },
    }));
  });

  it('calls the OidcInteractionCompleter when done.', async(): Promise<void> => {
    request = createRequest(
      { email: 'test@test.com', webId: 'webId!', password: 'password!', confirmPassword: 'password!' },
    );
    await expect(handler.handle({ request, response, provider })).resolves.toBeUndefined();
    expect(accountStore.create).toHaveBeenCalledTimes(1);
    expect(accountStore.create).toHaveBeenLastCalledWith('test@test.com', 'webId!', 'password!');
    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionCompleter.handleSafe)
      .toHaveBeenLastCalledWith({ request, response, provider, webId: 'webId!', shouldRemember: false });
  });
});
