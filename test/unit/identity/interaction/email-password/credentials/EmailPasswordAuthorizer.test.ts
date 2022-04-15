import type { Operation } from '../../../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../../../src/http/representation/Representation';
import type {
  CredentialsHandler,
} from '../../../../../../src/identity/interaction/email-password/credentials/CredentialsHandler';
import {
  EmailPasswordAuthorizer,
} from '../../../../../../src/identity/interaction/email-password/credentials/EmailPasswordAuthorizer';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import { APPLICATION_JSON } from '../../../../../../src/util/ContentTypes';
import { MethodNotAllowedHttpError } from '../../../../../../src/util/errors/MethodNotAllowedHttpError';

describe('An EmailPasswordAuthorizer', (): void => {
  const email = 'test@example.com';
  const password = 'super_secret';
  const webId = 'http://example.com/profile#me';
  let operation: Operation;
  let response: Representation;
  let accountStore: jest.Mocked<AccountStore>;
  let source: jest.Mocked<CredentialsHandler>;
  let handler: EmailPasswordAuthorizer;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'POST',
      body: new BasicRepresentation(JSON.stringify({ email, password }), APPLICATION_JSON),
      target: { path: 'http://example.com/foo' },
      preferences: {},
    };

    response = new BasicRepresentation();

    accountStore = {
      authenticate: jest.fn().mockResolvedValue(webId),
    } as any;

    source = {
      handleSafe: jest.fn().mockResolvedValue(response),
    } as any;

    handler = new EmailPasswordAuthorizer(accountStore, source);
  });

  it('requires POST methods.', async(): Promise<void> => {
    operation.method = 'GET';
    await expect(handler.handle({ operation })).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('calls the source after validation.', async(): Promise<void> => {
    await expect(handler.handle({ operation })).resolves.toBe(response);
    expect(accountStore.authenticate).toHaveBeenCalledTimes(1);
    expect(accountStore.authenticate).toHaveBeenLastCalledWith(email, password);
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ operation, body: { email, webId }});
  });
});
