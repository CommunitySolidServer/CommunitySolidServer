import type { Operation } from '../../../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../../../src/http/representation/BasicRepresentation';
import type {
  CredentialsHandlerBody,
} from '../../../../../../src/identity/interaction/email-password/credentials/CredentialsHandler';
import {
  ListCredentialsHandler,
} from '../../../../../../src/identity/interaction/email-password/credentials/ListCredentialsHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import { APPLICATION_JSON } from '../../../../../../src/util/ContentTypes';
import { readJsonStream } from '../../../../../../src/util/StreamUtil';

describe('A ListCredentialsHandler', (): void => {
  let operation: Operation;
  const id = 'token_id';
  let body: CredentialsHandlerBody;
  let accountStore: jest.Mocked<AccountStore>;
  let handler: ListCredentialsHandler;

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

    handler = new ListCredentialsHandler(accountStore);
  });

  it('lists all tokens.', async(): Promise<void> => {
    const response = await handler.handle({ operation, body });
    expect(response).toBeDefined();
    expect(response.metadata.contentType).toEqual(APPLICATION_JSON);
    const list = await readJsonStream(response.data);
    expect(list).toEqual([ id ]);
  });

  it('returns an empty array if there are no tokens.', async(): Promise<void> => {
    accountStore.getSettings.mockResolvedValue({ useIdp: true });
    const response = await handler.handle({ operation, body });
    expect(response).toBeDefined();
    expect(response.metadata.contentType).toEqual(APPLICATION_JSON);
    const list = await readJsonStream(response.data);
    expect(list).toEqual([]);
  });
});
