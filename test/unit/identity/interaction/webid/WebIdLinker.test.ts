import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import type { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import { WebIdLinker } from '../../../../../src/identity/interaction/webid/WebIdLinker';
import type { WebIdLinkRoute } from '../../../../../src/identity/interaction/webid/WebIdLinkRoute';
import type { OwnershipValidator } from '../../../../../src/identity/ownership/OwnershipValidator';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import type { IdentifierStrategy } from '../../../../../src/util/identifiers/IdentifierStrategy';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A WebIdLinker', (): void => {
  let account: Account;
  const accountId = 'accountId';
  const webId = 'http://example.com/profile/card#me';
  let json: unknown;
  const resource = 'http://example.com/.account/link';
  const baseUrl = 'http://example.com/';
  let ownershipValidator: jest.Mocked<OwnershipValidator>;
  let accountStore: jest.Mocked<AccountStore>;
  let webIdStore: jest.Mocked<WebIdStore>;
  let webIdRoute: jest.Mocked<WebIdLinkRoute>;
  let identifierStrategy: jest.Mocked<IdentifierStrategy>;
  let linker: WebIdLinker;

  beforeEach(async(): Promise<void> => {
    json = { webId };

    ownershipValidator = {
      handleSafe: jest.fn(),
    } as any;

    account = createAccount();
    accountStore = mockAccountStore(account);

    webIdStore = {
      add: jest.fn().mockResolvedValue(resource),
    } as any;

    identifierStrategy = {
      contains: jest.fn().mockReturnValue(true),
    } as any;

    linker = new WebIdLinker({
      accountStore,
      identifierStrategy,
      webIdRoute,
      webIdStore,
      ownershipValidator,
      baseUrl,
    });
  });

  it('requires a WebID as input.', async(): Promise<void> => {
    await expect(linker.getView()).resolves.toEqual({
      json: {
        fields: {
          webId: {
            required: true,
            type: 'string',
          },
        },
      },
    });
  });

  it('links the WebID.', async(): Promise<void> => {
    await expect(linker.handle({ accountId, json } as any)).resolves.toEqual({
      json: { resource, webId, oidcIssuer: baseUrl },
    });
    expect(webIdStore.add).toHaveBeenCalledTimes(1);
    expect(webIdStore.add).toHaveBeenLastCalledWith(webId, account);
  });

  it('throws an error if the WebID is already registered.', async(): Promise<void> => {
    account.webIds[webId] = resource;
    await expect(linker.handle({ accountId, json } as any)).rejects.toThrow(BadRequestHttpError);
    expect(webIdStore.add).toHaveBeenCalledTimes(0);
  });

  it('checks if the WebID is in a pod owned by the account.', async(): Promise<void> => {
    account.pods['http://example.com/.account/pod/'] = resource;
    await expect(linker.handle({ accountId, json } as any)).resolves.toEqual({
      json: { resource, webId, oidcIssuer: baseUrl },
    });
    expect(identifierStrategy.contains).toHaveBeenCalledTimes(1);
    expect(identifierStrategy.contains)
      .toHaveBeenCalledWith({ path: 'http://example.com/.account/pod/' }, { path: webId }, true);
    expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('calls the ownership validator if none of the pods contain the WebId.', async(): Promise<void> => {
    identifierStrategy.contains.mockReturnValue(false);
    account.pods['http://example.com/.account/pod/'] = resource;
    account.pods['http://example.com/.account/pod2/'] = resource;

    await expect(linker.handle({ accountId, json } as any)).resolves.toEqual({
      json: { resource, webId, oidcIssuer: baseUrl },
    });
    expect(identifierStrategy.contains).toHaveBeenCalledTimes(2);
    expect(identifierStrategy.contains)
      .toHaveBeenCalledWith({ path: 'http://example.com/.account/pod/' }, { path: webId }, true);
    expect(identifierStrategy.contains)
      .toHaveBeenCalledWith({ path: 'http://example.com/.account/pod2/' }, { path: webId }, true);
    expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
    expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
  });
});
