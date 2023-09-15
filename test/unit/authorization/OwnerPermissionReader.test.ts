import type { Credentials } from '../../../src/authentication/Credentials';
import { OwnerPermissionReader } from '../../../src/authorization/OwnerPermissionReader';
import { AclMode } from '../../../src/authorization/permissions/AclPermissionSet';
import type { AccessMap } from '../../../src/authorization/permissions/Permissions';
import { AuxiliaryIdentifierStrategy } from '../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { PodStore } from '../../../src/identity/interaction/pod/util/PodStore';
import { WebIdStore } from '../../../src/identity/interaction/webid/util/WebIdStore';
import type { StorageLocationStrategy } from '../../../src/server/description/StorageLocationStrategy';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../util/Util';

describe('An OwnerPermissionReader', (): void => {
  const owner = 'http://example.com/alice/profile/card#me';
  const podBaseUrl = 'http://example.com/alice/';
  const accountId = 'accountId';
  let credentials: Credentials;
  let identifier: ResourceIdentifier;
  let requestedModes: AccessMap;
  let podStore: jest.Mocked<PodStore>;
  let webIdStore: jest.Mocked<WebIdStore>;
  let aclStrategy: jest.Mocked<AuxiliaryIdentifierStrategy>;
  let storageStrategy: jest.Mocked<StorageLocationStrategy>;
  let reader: OwnerPermissionReader;

  beforeEach(async(): Promise<void> => {
    credentials = { agent: { webId: owner }};

    identifier = { path: `${podBaseUrl}.acl` };

    requestedModes = new IdentifierSetMultiMap([[ identifier, AclMode.control ]]) as any;

    podStore = {
      findAccount: jest.fn().mockResolvedValue(accountId),
    } satisfies Partial<PodStore> as any;

    webIdStore = {
      findLinks: jest.fn().mockResolvedValue([{ id: '???', webId: owner }]),
    } satisfies Partial<WebIdStore> as any;

    aclStrategy = {
      isAuxiliaryIdentifier: jest.fn((id): boolean => id.path.endsWith('.acl')),
    } satisfies Partial<AuxiliaryIdentifierStrategy> as any;

    storageStrategy = {
      getStorageIdentifier: jest.fn().mockResolvedValue(podBaseUrl),
    };

    reader = new OwnerPermissionReader(podStore, webIdStore, aclStrategy, storageStrategy);
  });

  it('returns empty permissions for non-ACL resources.', async(): Promise<void> => {
    identifier.path = podBaseUrl;
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns empty permissions if there is no agent WebID.', async(): Promise<void> => {
    credentials = {};
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns empty permissions if no root storage could be determined.', async(): Promise<void> => {
    storageStrategy.getStorageIdentifier.mockRejectedValueOnce(new Error('no root!'));
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns empty permissions if there is no pod owner.', async(): Promise<void> => {
    podStore.findAccount.mockResolvedValueOnce(undefined);
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap());
  });

  it('returns empty permissions if the agent WebID is not linked to the owner account.', async(): Promise<void> => {
    credentials.agent!.webId = 'http://example.com/otherWebId';
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
