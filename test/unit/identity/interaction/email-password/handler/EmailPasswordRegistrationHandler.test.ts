import type { Provider } from 'oidc-provider';
import {
  EmailPasswordRegistrationHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordRegistrationHandler';
import type {
  EmailPasswordStore,
} from '../../../../../../src/identity/interaction/email-password/storage/EmailPasswordStore';
import type {
  OidcInteractionCompleter,
} from '../../../../../../src/identity/interaction/util/OidcInteractionCompleter';
import type { WebIdOwnershipValidator } from '../../../../../../src/identity/interaction/util/WebIdOwnershipValidator';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import { createRequest } from './Util';

describe('An EmailPasswordRegistrationHandler', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = 'response!' as any;
  let provider: Provider;
  let webIdOwnershipValidator: WebIdOwnershipValidator;
  let emailPasswordStorageAdapter: EmailPasswordStore;
  let oidcInteractionCompleter: OidcInteractionCompleter;
  let handler: EmailPasswordRegistrationHandler;

  beforeEach(async(): Promise<void> => {
    provider = {
      interactionDetails: jest.fn().mockResolvedValue({ uid: 'uid!' }),
    } as any;

    webIdOwnershipValidator = {
      assertWebIdOwnership: jest.fn(),
    };

    emailPasswordStorageAdapter = {
      create: jest.fn(),
    } as any;

    oidcInteractionCompleter = {
      handleSafe: jest.fn(),
    } as any;

    handler = new EmailPasswordRegistrationHandler({
      webIdOwnershipValidator,
      emailPasswordStorageAdapter,
      oidcInteractionCompleter,
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
    expect(emailPasswordStorageAdapter.create).toHaveBeenCalledTimes(1);
    expect(emailPasswordStorageAdapter.create).toHaveBeenLastCalledWith('test@test.com', 'webId!', 'password!');
    expect(oidcInteractionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(oidcInteractionCompleter.handleSafe)
      .toHaveBeenLastCalledWith({ request, response, provider, webId: 'webId!', shouldRemember: false });
  });
});
