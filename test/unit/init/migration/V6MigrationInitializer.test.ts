import { ACCOUNT_TYPE, AccountLoginStorage } from '../../../../src/identity/interaction/account/util/LoginStorage';
import {
  CLIENT_CREDENTIALS_STORAGE_TYPE,
} from '../../../../src/identity/interaction/client-credentials/util/BaseClientCredentialsStore';
import { PASSWORD_STORAGE_TYPE } from '../../../../src/identity/interaction/password/util/BasePasswordStore';
import { OWNER_STORAGE_TYPE, POD_STORAGE_TYPE } from '../../../../src/identity/interaction/pod/util/BasePodStore';
import { WEBID_STORAGE_TYPE } from '../../../../src/identity/interaction/webid/util/BaseWebIdStore';
import { V6MigrationInitializer } from '../../../../src/init/migration/V6MigrationInitializer';
import { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';

type Account = {
  webId: string;
  email: string;
  password: string;
  verified: boolean;
};

type Settings = {
  useIdp: boolean;
  podBaseUrl?: string;
  clientCredentials?: string[];
};

type ClientCredentials = {
  webId: string;
  secret: string;
};

const questionMock = jest.fn().mockImplementation((input, callback): void => callback('y'));
const closeMock = jest.fn();
jest.mock('readline', (): any => ({
  createInterface: jest.fn().mockImplementation((): any => ({
    question: questionMock,
    close: closeMock,
  })),
}));

describe('A V6MigrationInitializer', (): void => {
  const webId = 'http://example.com/test/profile/card#me';
  const webId2 = 'http://example.com/test2/profile/card#me';
  let settings: Record<string, Settings>;
  let accounts: Record<string, Account>;
  let clientCredentials: Record<string, ClientCredentials>;
  const versionKey = 'version';
  let versionStorage: jest.Mocked<KeyValueStorage<string, string>>;
  let accountStorage: jest.Mocked<KeyValueStorage<string, Account | Settings>>;
  let clientCredentialsStorage: jest.Mocked<KeyValueStorage<string, ClientCredentials>>;
  let forgotPasswordStorage: jest.Mocked<KeyValueStorage<string, unknown>>;
  let newStorage: jest.Mocked<AccountLoginStorage<any>>;
  let initializer: V6MigrationInitializer;

  beforeEach(async(): Promise<void> => {
    settings = {
      [webId]: { useIdp: true, podBaseUrl: 'http://example.com/test/', clientCredentials: [ 'token' ]},
      [webId2]: { useIdp: true, podBaseUrl: 'http://example.com/test2/' },
    };
    accounts = {
      account: { email: 'EMAIL@example.com', password: '123', webId, verified: true },
      account2: { email: 'email2@example.com', password: '1234', webId: webId2, verified: true },
    };
    clientCredentials = {
      token: { webId, secret: 'secret!' },
    };

    versionStorage = {
      get: jest.fn().mockResolvedValue('6.0.0'),
    } satisfies Partial<KeyValueStorage<string, string>> as any;

    accountStorage = {
      get: jest.fn((id): any => settings[id] ?? accounts[id]),
      delete: jest.fn(),
      entries: jest.fn(async function* (): AsyncIterableIterator<[string, any]> {
        yield* Object.entries(accounts);
        yield* Object.entries(settings);
      }),
    } satisfies Partial<KeyValueStorage<string, any>> as any;

    clientCredentialsStorage = {
      delete: jest.fn(),
      entries: jest.fn(async function* (): AsyncIterableIterator<[string, any]> {
        yield* Object.entries(clientCredentials);
      }),
    } satisfies Partial<KeyValueStorage<string, any>> as any;

    forgotPasswordStorage = {
      delete: jest.fn(),
      entries: jest.fn(async function* (): AsyncIterableIterator<[string, any]> {
        yield [ 'forgot', {}];
      }),
    } satisfies Partial<KeyValueStorage<string, any>> as any;

    newStorage = {
      create: jest.fn((type): any => ({ id: `${type}-id` })),
    } satisfies Partial<AccountLoginStorage<any>> as any;

    initializer = new V6MigrationInitializer({
      versionKey,
      versionStorage,
      accountStorage,
      clientCredentialsStorage,
      forgotPasswordStorage,
      newStorage,
      skipConfirmation: true,
    });
  });

  it('migrates the data.', async(): Promise<void> => {
    await expect(initializer.handle()).resolves.toBeUndefined();

    expect(versionStorage.get).toHaveBeenCalledTimes(1);
    expect(versionStorage.get).toHaveBeenLastCalledWith(versionKey);

    expect(accountStorage.get).toHaveBeenCalledTimes(2);
    expect(accountStorage.get).toHaveBeenCalledWith(webId);
    expect(accountStorage.get).toHaveBeenCalledWith(webId2);
    expect(accountStorage.delete).toHaveBeenCalledTimes(4);
    expect(accountStorage.delete).toHaveBeenCalledWith(webId);
    expect(accountStorage.delete).toHaveBeenCalledWith(webId2);
    expect(accountStorage.delete).toHaveBeenCalledWith('account');
    expect(accountStorage.delete).toHaveBeenCalledWith('account2');

    expect(clientCredentialsStorage.delete).toHaveBeenCalledTimes(1);
    expect(clientCredentialsStorage.delete).toHaveBeenCalledWith('token');

    expect(forgotPasswordStorage.delete).toHaveBeenCalledTimes(1);
    expect(forgotPasswordStorage.delete).toHaveBeenCalledWith('forgot');

    expect(newStorage.create).toHaveBeenCalledTimes(11);
    expect(newStorage.create).toHaveBeenCalledWith(ACCOUNT_TYPE, {});
    expect(newStorage.create).toHaveBeenCalledWith(PASSWORD_STORAGE_TYPE,
      { email: 'email@example.com', password: '123', verified: true, accountId: 'account-id' });
    expect(newStorage.create).toHaveBeenCalledWith(PASSWORD_STORAGE_TYPE,
      { email: 'email2@example.com', password: '1234', verified: true, accountId: 'account-id' });
    expect(newStorage.create).toHaveBeenCalledWith(WEBID_STORAGE_TYPE, { webId, accountId: 'account-id' });
    expect(newStorage.create).toHaveBeenCalledWith(WEBID_STORAGE_TYPE, { webId: webId2, accountId: 'account-id' });
    expect(newStorage.create).toHaveBeenCalledWith(POD_STORAGE_TYPE, { baseUrl: 'http://example.com/test/', accountId: 'account-id' });
    expect(newStorage.create).toHaveBeenCalledWith(POD_STORAGE_TYPE, { baseUrl: 'http://example.com/test2/', accountId: 'account-id' });
    expect(newStorage.create).toHaveBeenCalledWith(OWNER_STORAGE_TYPE, { webId, podId: 'pod-id', visible: false });
    expect(newStorage.create).toHaveBeenCalledWith(OWNER_STORAGE_TYPE,
      { webId: webId2, podId: 'pod-id', visible: false });
    expect(newStorage.create).toHaveBeenCalledWith(CLIENT_CREDENTIALS_STORAGE_TYPE,
      { label: 'token', secret: 'secret!', webId, accountId: 'account-id' });
  });

  it('does nothing if the server has no stored version number.', async(): Promise<void> => {
    versionStorage.get.mockResolvedValueOnce(undefined);
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(accountStorage.get).toHaveBeenCalledTimes(0);
    expect(newStorage.create).toHaveBeenCalledTimes(0);
  });

  it('does nothing if stored version is more than 6.', async(): Promise<void> => {
    versionStorage.get.mockResolvedValueOnce('7.0.0');
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(accountStorage.get).toHaveBeenCalledTimes(0);
    expect(newStorage.create).toHaveBeenCalledTimes(0);
  });

  it('ignores accounts and credentials for which it cannot find the settings.', async(): Promise<void> => {
    delete settings[webId];
    await expect(initializer.handle()).resolves.toBeUndefined();

    expect(versionStorage.get).toHaveBeenCalledTimes(1);
    expect(versionStorage.get).toHaveBeenLastCalledWith(versionKey);

    expect(accountStorage.get).toHaveBeenCalledTimes(2);
    expect(accountStorage.get).toHaveBeenCalledWith(webId);
    expect(accountStorage.get).toHaveBeenCalledWith(webId2);
    expect(accountStorage.delete).toHaveBeenCalledTimes(3);
    expect(accountStorage.delete).toHaveBeenCalledWith(webId2);
    expect(accountStorage.delete).toHaveBeenCalledWith('account');
    expect(accountStorage.delete).toHaveBeenCalledWith('account2');

    expect(newStorage.create).toHaveBeenCalledTimes(5);
    expect(newStorage.create).toHaveBeenCalledWith(ACCOUNT_TYPE, {});
    expect(newStorage.create).toHaveBeenCalledWith(PASSWORD_STORAGE_TYPE,
      { email: 'email2@example.com', password: '1234', verified: true, accountId: 'account-id' });
    expect(newStorage.create).toHaveBeenCalledWith(WEBID_STORAGE_TYPE, { webId: webId2, accountId: 'account-id' });
    expect(newStorage.create).toHaveBeenCalledWith(POD_STORAGE_TYPE, { baseUrl: 'http://example.com/test2/', accountId: 'account-id' });
    expect(newStorage.create).toHaveBeenCalledWith(OWNER_STORAGE_TYPE,
      { webId: webId2, podId: 'pod-id', visible: false });
  });

  describe('with prompts enabled', (): void => {
    beforeEach(async(): Promise<void> => {
      jest.clearAllMocks();

      initializer = new V6MigrationInitializer({
        versionKey,
        versionStorage,
        accountStorage,
        clientCredentialsStorage,
        forgotPasswordStorage,
        newStorage,
        skipConfirmation: false,
      });
    });

    it('shows a prompt before migrating the data.', async(): Promise<void> => {
      await expect(initializer.handle()).resolves.toBeUndefined();

      expect(questionMock).toHaveBeenCalledTimes(1);
      expect(questionMock.mock.invocationCallOrder[0]).toBeLessThan(newStorage.create.mock.invocationCallOrder[0]);

      expect(newStorage.create).toHaveBeenCalledTimes(11);
    });

    it('throws an error to stop the server if no positive answer is received.', async(): Promise<void> => {
      questionMock.mockImplementation((input, callback): void => callback('n'));
      await expect(initializer.handle()).rejects.toThrow('Stopping server as migration was cancelled.');
      expect(newStorage.create).toHaveBeenCalledTimes(0);
    });

    it('does not show the prompt if there are no accounts.', async(): Promise<void> => {
      settings = {};
      accounts = {};
      await expect(initializer.handle()).resolves.toBeUndefined();
      expect(questionMock).toHaveBeenCalledTimes(0);
      expect(accountStorage.get).toHaveBeenCalledTimes(0);
      expect(newStorage.create).toHaveBeenCalledTimes(0);
    });
  });
});
