import type { Credentials } from '../../../src/authentication/Credentials';
import { OwnerPermissionReader } from '../../../src/authorization/OwnerPermissionReader';
import { AclMode } from '../../../src/authorization/permissions/AclPermissionSet';
import type { AccessMap } from '../../../src/authorization/permissions/Permissions';
import type { AuxiliaryIdentifierStrategy } from '../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { Account } from '../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../src/identity/interaction/account/util/AccountStore';
import type { WebIdStore } from '../../../src/identity/interaction/webid/util/WebIdStore';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { createAccount } from '../../util/AccountUtil';
import { compareMaps } from '../../util/Util';

describe('An OwnerPermissionReader', (): void => {
  const owner = 'http://example.com/alice/profile/card#me';
  const podBaseUrl = 'http://example.com/alice/';
  let credentials: Credentials;
  let identifier: ResourceIdentifier;
  let requestedModes: AccessMap;
  let account: Account;
  let accountStore: jest.Mocked<AccountStore>;
  let webIdStore: jest.Mocked<WebIdStore>;
  let aclStrategy: jest.Mocked<AuxiliaryIdentifierStrategy>;
  const identifierStrategy = new SingleRootIdentifierStrategy('http://example.com/');
  let reader: OwnerPermissionReader;

  beforeEach(async(): Promise<void> => {
    credentials = { agent: { webId: owner }};

    identifier = { path: `${podBaseUrl}.acl` };

    requestedModes = new IdentifierSetMultiMap([[ identifier, AclMode.control ]]) as any;

    account = createAccount();
    account.pods[podBaseUrl] = 'url';
    account.webIds[owner] = 'url';

    webIdStore = {
      get: jest.fn().mockResolvedValue([ account.id ]),
    } as any;

    accountStore = {
      get: jest.fn().mockResolvedValue(account),
    } as any;

    aclStrategy = {
      isAuxiliaryIdentifier: jest.fn((id): boolean => id.path.endsWith('.acl')),
    } as any;

    reader = new OwnerPermissionReader(webIdStore, accountStore, aclStrategy, identifierStrategy);
  });

  it('returns empty permissions for non-ACL resources.', async(): Promise<void> => {
    identifier.path = podBaseUrl;
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns empty permissions if there is no agent WebID.', async(): Promise<void> => {
    credentials = {};
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns empty permissions if the agent has no account.', async(): Promise<void> => {
    webIdStore.get.mockResolvedValueOnce([]);
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns empty permissions if no account was found for the stored ID.', async(): Promise<void> => {
    accountStore.get.mockResolvedValueOnce(undefined);
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns empty permissions if the account has no pod.', async(): Promise<void> => {
    delete account.pods[podBaseUrl];
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns empty permissions if the target identifier is not in the pod.', async(): Promise<void> => {
    identifier.path = 'http://somewhere.else/.acl';
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns full permissions if the owner is accessing an ACL resource in their pod.', async(): Promise<void> => {
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap([[
      identifier,
      {
        read: true,
        write: true,
        append: true,
        create: true,
        delete: true,
        control: true,
      },
    ]]));
  });
});
