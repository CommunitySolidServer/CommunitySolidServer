import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import {
  CreateClientCredentialsHandler,
} from '../../../../../src/identity/interaction/client-credentials/CreateClientCredentialsHandler';
import type {
  ClientCredentialsStore,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

jest.mock('uuid', (): any => ({ v4: (): string => '4c9b88c1-7502-4107-bb79-2a3a590c7aa3' }));

describe('A CreateClientCredentialsHandler', (): void => {
  let account: Account;
  const json = {
    webId: 'http://example.com/foo#me',
    name: 'token',
  };
  let accountStore: jest.Mocked<AccountStore>;
  let clientCredentialsStore: jest.Mocked<ClientCredentialsStore>;
  let handler: CreateClientCredentialsHandler;

  beforeEach(async(): Promise<void> => {
    account = createAccount();

    accountStore = mockAccountStore(account);

    clientCredentialsStore = {
      add: jest.fn().mockReturnValue({ secret: 'secret', resource: 'resource' }),
    } as any;

    handler = new CreateClientCredentialsHandler(accountStore, clientCredentialsStore);
  });

  it('requires specific input fields.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({
      json: {
        fields: {
          name: {
            required: false,
            type: 'string',
          },
          webId: {
            required: true,
            type: 'string',
          },
        },
      },
    });
  });

  it('creates a new token based on the provided settings.', async(): Promise<void> => {
    await expect(handler.handle({ accountId: account.id, json } as any)).resolves.toEqual({
      json: { id: 'token_4c9b88c1-7502-4107-bb79-2a3a590c7aa3', secret: 'secret', resource: 'resource' },
    });
  });

  it('allows token names to be empty.', async(): Promise<void> => {
    await expect(handler.handle({ accountId: account.id, json: { webId: 'http://example.com/foo#me' }} as any))
      .resolves.toEqual({
        json: { id: '_4c9b88c1-7502-4107-bb79-2a3a590c7aa3', secret: 'secret', resource: 'resource' },
      });
  });
});
