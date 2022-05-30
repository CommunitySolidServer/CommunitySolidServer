import type { Operation } from '../../../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../../../src/http/representation/BasicRepresentation';
import type {
  ClientCredentials,
} from '../../../../../../src/identity/interaction/email-password/credentials/ClientCredentialsAdapterFactory';
import {
  CreateCredentialsHandler,
} from '../../../../../../src/identity/interaction/email-password/credentials/CreateCredentialsHandler';
import type {
  CredentialsHandlerBody,
} from '../../../../../../src/identity/interaction/email-password/credentials/CredentialsHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type { KeyValueStorage } from '../../../../../../src/storage/keyvalue/KeyValueStorage';
import { APPLICATION_JSON } from '../../../../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../../../src/util/errors/NotImplementedHttpError';
import { readJsonStream } from '../../../../../../src/util/StreamUtil';

describe('A CreateCredentialsHandler', (): void => {
  let operation: Operation;
  let body: CredentialsHandlerBody;
  let accountStore: jest.Mocked<AccountStore>;
  let credentialStorage: jest.Mocked<KeyValueStorage<string, ClientCredentials>>;
  let handler: CreateCredentialsHandler;

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
      name: 'token',
    };

    accountStore = {
      getSettings: jest.fn().mockResolvedValue({ useIdp: true, clientCredentials: []}),
      updateSettings: jest.fn(),
    } as any;

    credentialStorage = {
      set: jest.fn(),
    } as any;

    handler = new CreateCredentialsHandler(accountStore, credentialStorage);
  });

  it('only supports bodies with a name entry.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation, body })).resolves.toBeUndefined();
    delete body.name;
    await expect(handler.canHandle({ operation, body })).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects requests for accounts not using the IDP.', async(): Promise<void> => {
    accountStore.getSettings.mockResolvedValue({ useIdp: false });
    await expect(handler.handle({ operation, body })).rejects.toThrow(BadRequestHttpError);
  });

  it('creates a new credential token.', async(): Promise<void> => {
    const response = await handler.handle({ operation, body });
    expect(response.metadata.contentType).toBe(APPLICATION_JSON);
    const { id, secret } = await readJsonStream(response.data);
    expect(id).toMatch(/^token_/u);
    expect(credentialStorage.set).toHaveBeenCalledTimes(1);
    expect(credentialStorage.set).toHaveBeenLastCalledWith(id, { webId: body.webId, secret });
    expect(accountStore.getSettings).toHaveBeenCalledTimes(1);
    expect(accountStore.getSettings).toHaveBeenLastCalledWith(body.webId);
    expect(accountStore.updateSettings).toHaveBeenCalledTimes(1);
    expect(accountStore.updateSettings)
      .toHaveBeenLastCalledWith(body.webId, { useIdp: true, clientCredentials: [ id ]});
  });

  it('can handle account settings with undefined client credentials.', async(): Promise<void> => {
    accountStore.getSettings.mockResolvedValue({ useIdp: true });
    const response = await handler.handle({ operation, body });
    expect(response.metadata.contentType).toBe(APPLICATION_JSON);
    const { id, secret } = await readJsonStream(response.data);
    expect(id).toMatch(/^token_/u);
    expect(credentialStorage.set).toHaveBeenCalledTimes(1);
    expect(credentialStorage.set).toHaveBeenLastCalledWith(id, { webId: body.webId, secret });
    expect(accountStore.getSettings).toHaveBeenCalledTimes(1);
    expect(accountStore.getSettings).toHaveBeenLastCalledWith(body.webId);
    expect(accountStore.updateSettings).toHaveBeenCalledTimes(1);
    expect(accountStore.updateSettings)
      .toHaveBeenLastCalledWith(body.webId, { useIdp: true, clientCredentials: [ id ]});
  });
});
