import type { Operation } from '../../../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../../../src/http/representation/BasicRepresentation';
import type {
  ClientCredentials,
} from '../../../../../../src/identity/interaction/email-password/credentials/ClientCredentialsAdapterFactory';
import type {
  CredentialsHandlerBody,
} from '../../../../../../src/identity/interaction/email-password/credentials/CredentialsHandler';
import {
  DeleteCredentialsHandler,
} from '../../../../../../src/identity/interaction/email-password/credentials/DeleteCredentialsHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { KeyValueStorage } from '../../../../../../src/storage/keyvalue/KeyValueStorage';
import { APPLICATION_JSON } from '../../../../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../../../src/util/errors/NotImplementedHttpError';

describe('A DeleteCredentialsHandler', (): void => {
  let operation: Operation;
  const id = 'token_id';
  let body: CredentialsHandlerBody;
  let accountStore: jest.Mocked<AccountStore>;
  let credentialStorage: jest.Mocked<KeyValueStorage<string, ClientCredentials>>;
  let handler: DeleteCredentialsHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'POST',
      body: new BasicRepresentation(),
      target: { path: 'http://example.com/foo' },
      preferences: {},
    };

    body = {
      email: 'test@example.com',
      webId: 'http://example.com/foo#me',
      delete: id,
    };

    accountStore = {
      getSettings: jest.fn().mockResolvedValue({ clientCredentials: [ id ]}),
      updateSettings: jest.fn(),
    } as any;

    credentialStorage = {
      delete: jest.fn(),
    } as any;

    handler = new DeleteCredentialsHandler(accountStore, credentialStorage);
  });

  it('only supports bodies with a delete entry.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation, body })).resolves.toBeUndefined();
    delete body.delete;
    await expect(handler.canHandle({ operation, body })).rejects.toThrow(NotImplementedHttpError);
  });

  it('deletes the token.', async(): Promise<void> => {
    const response = await handler.handle({ operation, body });
    expect(response.metadata.contentType).toBe(APPLICATION_JSON);
    expect(credentialStorage.delete).toHaveBeenCalledTimes(1);
    expect(credentialStorage.delete).toHaveBeenLastCalledWith(id);
    expect(accountStore.getSettings).toHaveBeenCalledTimes(1);
    expect(accountStore.getSettings).toHaveBeenLastCalledWith(body.webId);
    expect(accountStore.updateSettings).toHaveBeenCalledTimes(1);
    expect(accountStore.updateSettings).toHaveBeenLastCalledWith(body.webId, { clientCredentials: []});
  });

  it('errors if the account has no such token.', async(): Promise<void> => {
    accountStore.getSettings.mockResolvedValue({ useIdp: true, clientCredentials: []});
    await expect(handler.handle({ operation, body })).rejects.toThrow(BadRequestHttpError);

    accountStore.getSettings.mockResolvedValue({ useIdp: true });
    await expect(handler.handle({ operation, body })).rejects.toThrow(BadRequestHttpError);
  });
});
